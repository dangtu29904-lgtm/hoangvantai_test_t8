package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.*;
import com.taihoang.social_backend.Service.StoryAccessService;
import com.taihoang.social_backend.Service.StoryMessageReferenceMapper;
import com.taihoang.social_backend.Service.StoryReplyService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StoryReplyServiceImpl implements StoryReplyService {

    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessengerRepository messengerRepository;
    private final MessengerStatusRepository messengerStatusRepository;
    private final StoryAccessService storyAccessService;
    private final StoryMessageReferenceMapper storyReferenceMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public MessageResponse replyToStory(Long currentUserId, Long storyId, StoryReplyRequest request) {

        // 1. Load active story
        Story story = storyRepository.findActiveById(storyId, LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Story khong ton tai hoac da het han"));

        // 2. Access check
        storyAccessService.validateCanView(currentUserId, story);

        // 3. Cannot reply own story
        if (story.getAuthor().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ban khong the reply Story cua chinh minh");
        }

        User sender = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User khong hop le"));

        User storyAuthor = story.getAuthor();

        // 4. Auto-mark story viewed (idempotent)
        ensureViewed(story, sender);

        // 5. Get or create 1-1 conversation
        Conversations conversation = getOrCreateDirectConversation(sender, storyAuthor);

        // 6. Idempotent: if same clientMessageId exists in conversation → return existing
        Optional<Messenger> existingMsg = messengerRepository
                .findByConversationIdAndClientMessageId(conversation.getId(), request.clientMessageId());

        if (existingMsg.isPresent()) {
            Messenger existing = existingMsg.get();
            StoryMessageReferenceResponse storyRef = storyReferenceMapper.map(currentUserId, story);
            return buildResponse(existing, storyRef);
        }

        // 7. Create new Story Reply message
        Long nextSeq = messengerRepository.findMaxSequenceNumberByConversationId(conversation.getId()) + 1;

        Messenger message = new Messenger();
        message.setConversation(conversation);
        message.setUser(sender);
        message.setClientMessageId(request.clientMessageId());
        message.setContent(request.content().trim());
        message.setSequenceNumber(nextSeq);
        message.setSentAt(LocalDateTime.now());
        message.setMessageType(MessageType.STORY_REPLY);
        message.setStoryReference(story);

        Messenger saved = messengerRepository.save(message);

        // 8. Create MessengerStatus for story author (recipient)
        MessengerStatus status = new MessengerStatus();
        status.setMessenger(saved);
        status.setUser(storyAuthor);
        messengerStatusRepository.save(status);

        // 9. Build response with story reference
        StoryMessageReferenceResponse storyRef = storyReferenceMapper.map(currentUserId, story);
        MessageResponse response = buildResponse(saved, storyRef);

        // 10. Realtime delivery via Chat WebSocket (AFTER save, within transaction so AFTER_COMMIT via spring)
        // Sender ACK (all sender browsers)
        messagingTemplate.convertAndSendToUser(
                sender.getEmail(),
                "/queue/messages.ack",
                response
        );
        // Recipient gets the message
        messagingTemplate.convertAndSendToUser(
                storyAuthor.getEmail(),
                "/queue/messages",
                response
        );

        return response;
    }

    // --------------------------------
    // Get or create 1-1 conversation
    // --------------------------------
    private Conversations getOrCreateDirectConversation(User userA, User userB) {
        List<Conversations> existing = conversationRepository.findDirectConversations(
                Conversations.type_chat.private_chat,
                userA.getId(),
                userB.getId(),
                PageRequest.of(0, 1)
        );

        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        // Create new direct conversation
        Conversations conv = new Conversations();
        conv.setType(Conversations.type_chat.private_chat);
        conv.setCreateAt(LocalDate.now());
        Conversations savedConv = conversationRepository.save(conv);

        // Add both members
        Conversation_Member memberA = new Conversation_Member();
        memberA.setConversation(savedConv);
        memberA.setUser(userA);
        memberA.setJoinAt(LocalDate.now());
        memberA.setMemberRole(Conversation_Member.MemberRole.MEMBER);
        conversationMemberRepository.save(memberA);

        Conversation_Member memberB = new Conversation_Member();
        memberB.setConversation(savedConv);
        memberB.setUser(userB);
        memberB.setJoinAt(LocalDate.now());
        memberB.setMemberRole(Conversation_Member.MemberRole.MEMBER);
        conversationMemberRepository.save(memberB);

        return savedConv;
    }

    // --------------------------------
    // Auto-mark story as viewed
    // --------------------------------
    private void ensureViewed(Story story, User viewer) {
        if (!storyViewRepository.existsByStory_IdAndViewer_Id(story.getId(), viewer.getId())) {
            StoryView view = new StoryView();
            view.setStory(story);
            view.setViewer(viewer);
            storyViewRepository.save(view);
        }
    }

    // --------------------------------
    // Build MessageResponse
    // --------------------------------
    private MessageResponse buildResponse(Messenger m, StoryMessageReferenceResponse storyRef) {
        // If message was recalled, clear content and story preview
        boolean recalled = m.getRecalledAt() != null;
        String visibleContent = recalled ? null : m.getContent();
        StoryMessageReferenceResponse visibleStoryRef = recalled ? null : storyRef;

        return new MessageResponse(
                m.getId(),
                m.getConversation().getId(),
                m.getClientMessageId(),
                m.getSequenceNumber(),
                m.getMessageType() != null ? m.getMessageType() : MessageType.STORY_REPLY,
                m.getUser().getId(),
                m.getUser().getUserName(),
                visibleContent,
                m.getSentAt(),
                null,       // replyTo — Story Reply does not use replyToMessage
                m.getEditedAt(),
                m.getRecalledAt(),
                m.getSeenAt(),
                List.of(),  // reactions
                List.of(),  // attachments
                visibleStoryRef
        );
    }
}

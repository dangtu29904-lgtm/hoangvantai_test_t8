package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.MessageAttachmentRepository;
import com.taihoang.social_backend.Repository.MessageReactionRepository;
import com.taihoang.social_backend.Repository.MessengerRepository;
import com.taihoang.social_backend.Service.MessageQueryService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageQueryServiceImpl implements MessageQueryService {
    private static final int MAX_LIMIT = 100;

    private final ConversationMemberRepository conversationMemberRepository;
    private final MessengerRepository messengerRepository;
    private final MessageReactionRepository messageReactionRepository;
    private final MessageAttachmentRepository messageAttachmentRepository;
    /**
     * Luong xu ly chinh cua API lay lich su tin nhan.
     */
    @Override
    @Transactional(readOnly = true)
    public MessageHistoryResponse getMessages(
            Long currentUserId,
            Long conversationId,
            Long beforeSequence,
            int requestedLimit
    ) {
        validateRequest(currentUserId, conversationId, beforeSequence, requestedLimit);
        checkConversationMembership(currentUserId, conversationId);

        List<Messenger> queriedMessages = findMessagePage(
                conversationId,
                currentUserId,
                beforeSequence,
                requestedLimit
        );


        boolean hasMore = queriedMessages.size() > requestedLimit;
        List<Messenger> pageMessages = takeCurrentPage(
                queriedMessages,
                requestedLimit,
                hasMore
        );
        Long nextBeforeSequence = buildNextBeforeSequence(pageMessages, hasMore);
        // =======================================
        // LOAD REACTION CHO TOAN BO PAGE and file
        // =======================================

        Map<Long, List<MessageReaction>>
                reactionsByMessageId =
                loadReactions(pageMessages);
        Map<Long, List<MessageAttachment>>
                attachmentsByMessageId =
                loadAttachments(pageMessages);
        // =======================================
        // MAP RESPONSE
        // =======================================

        List<MessageResponse> items =
                toChronologicalResponses(
                        pageMessages,
                        reactionsByMessageId,
                        attachmentsByMessageId
                );
        return new MessageHistoryResponse(items, nextBeforeSequence, hasMore);
    }

    /**
     * Kiem tra tham so truoc khi truy van database.
     */
    private void validateRequest(
            Long currentUserId,
            Long conversationId,
            Long beforeSequence,
            int limit
    ) {
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException("user khong hop le");
        }
        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException("conversationId khong hop le");
        }
        if (beforeSequence != null && beforeSequence < 1) {
            throw new IllegalArgumentException("beforeSequence phai lon hon 0");
        }
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new IllegalArgumentException("limit phai nam trong khoang 1 den " + MAX_LIMIT);
        }
    }

    /**
     * Ngan user doc tin nhan cua conversation ma ho khong tham gia.
     */
    private void checkConversationMembership(Long currentUserId, Long conversationId) {
        boolean isMember = conversationMemberRepository
                .existsByConversationIdAndUserId(conversationId, currentUserId);
        if (!isMember) {
            throw new IllegalArgumentException("User khong thuoc conversation nay");
        }
    }

    /**
     * Repository tra ve tin moi den cu va lay them mot dong de kiem tra con trang sau.
     */
    private List<Messenger> findMessagePage(
            Long conversationId,
            Long currentUserId ,
            Long beforeSequence,
            int limit
    ) {
        return messengerRepository.findMessageHistory(
                conversationId,
                currentUserId,
                beforeSequence,
                PageRequest.of(0, limit + 1)
        );
    }

    private List<Messenger> takeCurrentPage(
            List<Messenger> queriedMessages,
            int limit,
            boolean hasMore
    ) {
        if (!hasMore) {
            return new ArrayList<>(queriedMessages);
        }
        return new ArrayList<>(queriedMessages.subList(0, limit));
    }

    /**
     * Sequence nho nhat cua trang hien tai se la moc de lay cac tin cu hon.
     */
    private Long buildNextBeforeSequence(
            List<Messenger> pageMessages,
            boolean hasMore
    ) {
        if (!hasMore || pageMessages.isEmpty()) {
            return null;
        }
        return pageMessages.get(pageMessages.size() - 1).getSequenceNumber();
    }

    /**
     * Query lay tu moi den cu, sau do dao lai de frontend nhan duoc thu tu cu den moi.
     */
    private List<MessageResponse> toChronologicalResponses(
            List<Messenger> pageMessages,
            Map<Long, List<MessageReaction>>
                    reactionsByMessageId,
            Map<Long, List<MessageAttachment>>
                    attachmentsByMessageId
    ) {
        List<Messenger> chronologicalMessages =
                new ArrayList<>(pageMessages);
        // Repository lấy DESC:
        // 105, 104, 103, 102...
        //
        // Frontend cần:
        // 102, 103, 104, 105...
        Collections.reverse(
                chronologicalMessages
        );
        return chronologicalMessages
                .stream()
                .map(messenger ->
                        toMessageResponse(
                                messenger,
                                reactionsByMessageId,
                                attachmentsByMessageId
                        )
                )
                .toList();
    }
    private MessageResponse toMessageResponse(
            Messenger messenger,
            Map<Long, List<MessageReaction>>
                    reactionsByMessageId ,
            Map<Long, List<MessageAttachment>>
                    attachmentsByMessageId
    ) {
        List<MessageAttachment> messageAttachments =
                attachmentsByMessageId
                        .getOrDefault(
                                messenger.getId(),
                                List.of()
                        );
        List<MessageAttachmentResponse> attachmentResponses;
        if (messenger.getRecalledAt() != null) {
            attachmentResponses =
                    List.of();
        } else {
            attachmentResponses =
                    messageAttachments
                            .stream()
                            .map(attachment -> {
                                ChatUpload upload =
                                        attachment
                                                .getChatUpload();
                                return new MessageAttachmentResponse(
                                        attachment.getId(),
                                        upload
                                                .getAttachmentType(),
                                        upload
                                                .getSecureUrl(),
                                        upload
                                                .getOriginalFileName(),
                                        upload
                                                .getContentType(),
                                        upload
                                                .getFileSize()
                                );
                            })
                            .toList();
        }
        ReplyMessageResponse replyResponse = null;
        Messenger replyTo =
                messenger.getReplyToMessage();

        if (replyTo != null) {
            boolean recalled = replyTo.getRecalledAt()!=null ;
            String replyVisibleContent =
                    recalled
                            ? null
                            : replyTo.getContent();
            replyResponse =
                    new ReplyMessageResponse(
                            replyTo.getId(),
                            replyTo
                                    .getUser()
                                    .getId(),
                            replyTo
                                    .getUser()
                                    .getUserName(),
                            replyVisibleContent,
                            recalled
                    );
        }
        String visibleContent =
                messenger.getRecalledAt() != null
                        ? null
                        : messenger.getContent();
        List<MessageReaction> messageReactions =
                reactionsByMessageId
                        .getOrDefault(
                                messenger.getId(),
                                List.of()
                        );
        List<MessageReactionItemResponse>
                reactionResponses;
        if (messenger.getRecalledAt() != null) {
            reactionResponses =
                    List.of();
        } else {
            reactionResponses =
                    messageReactions
                            .stream()
                            .map(reaction ->
                                    new MessageReactionItemResponse(
                                            reaction
                                                    .getUser()
                                                    .getId(),
                                            reaction
                                                    .getUser()
                                                    .getUserName(),
                                            reaction.getType()
                                    )
                            )
                            .toList();
        }
        return new MessageResponse(
                messenger.getId(),
                messenger
                        .getConversation()
                        .getId(),
                messenger.getClientMessageId(),
                messenger.getSequenceNumber(),
                normalizeMessageType(
                        messenger
                ),
                messenger
                        .getUser()
                        .getId(),
                messenger
                        .getUser()
                        .getUserName(),
                visibleContent ,
                messenger.getSentAt(),
                replyResponse,
                messenger.getEditedAt(),
                messenger.getRecalledAt(),
                reactionResponses,
                attachmentResponses
        );
    }
    private Map<Long, List<MessageReaction>>
    loadReactions(
            List<Messenger> messages
    ) {

        if (messages.isEmpty()) {
            return Map.of();
        }


        List<Long> messageIds =
                messages
                        .stream()
                        .map(Messenger::getId)
                        .toList();


        List<MessageReaction> reactions =
                messageReactionRepository
                        .findByMessageIds(
                                messageIds
                        );


        return reactions
                .stream()
                .collect(
                        Collectors.groupingBy(
                                reaction ->
                                        reaction
                                                .getMessenger()
                                                .getId()
                        )
                );
    }
    private Map<Long, List<MessageAttachment>>
    loadAttachments(
            List<Messenger> messages
    ) {

        if (messages.isEmpty()) {
            return Map.of();
        }


        List<Long> messageIds =
                messages
                        .stream()
                        .map(Messenger::getId)
                        .toList();


        List<MessageAttachment> attachments =
                messageAttachmentRepository
                        .findByMessageIds(
                                messageIds
                        );


        return attachments
                .stream()
                .collect(
                        Collectors.groupingBy(
                                attachment ->
                                        attachment
                                                .getMessenger()
                                                .getId()
                        )
                );
    }
    private MessageType normalizeMessageType(
            Messenger messenger
    ) {

        return messenger.getMessageType() == null
                ? MessageType.USER
                : messenger.getMessageType();
    }
}

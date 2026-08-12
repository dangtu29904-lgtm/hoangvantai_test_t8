package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.Conversations;
import com.taihoang.social_backend.Entity.Messenger;
import com.taihoang.social_backend.Entity.MessengerStatus;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.ConversationRepository;
import com.taihoang.social_backend.Repository.MessengerRepository;
import com.taihoang.social_backend.Repository.MessengerStatusRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.dto.DeliveredRequest;
import com.taihoang.social_backend.dto.DeliveredResponse;
import com.taihoang.social_backend.dto.DeliveredResult;
import com.taihoang.social_backend.dto.MessageRequest;
import com.taihoang.social_backend.dto.MessageResponse;
import com.taihoang.social_backend.dto.SendMessageResult;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MessageService {
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessengerRepository messengerRepository;
    private final MessengerStatusRepository messengerStatusRepository;

    public MessageService(UserRepository userRepository,
                          ConversationRepository conversationRepository,
                          ConversationMemberRepository conversationMemberRepository,
                          MessengerRepository messengerRepository,
                          MessengerStatusRepository messengerStatusRepository) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.messengerRepository = messengerRepository;
        this.messengerStatusRepository = messengerStatusRepository;
    }

    @Transactional
    public SendMessageResult handleSendMessage(Long senderId, MessageRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy user gửi tin nhắn"));

        Conversations conversation = conversationRepository.findByIdForUpdate(request.conversationId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy conversation"));

        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(
                conversation.getId(),
                sender.getId()
        );
        if (!isMember) {
            throw new IllegalArgumentException("User không thuộc conversation này");
        }

        return messengerRepository
                .findByConversationIdAndClientMessageId(conversation.getId(), request.clientMessageId())
                .map(message -> new SendMessageResult(toResponse(message), sender.getEmail(), List.of()))
                .orElseGet(() -> createMessage(sender, conversation, request));
    }

    @Transactional
    public DeliveredResult handleDelivered(Long recipientId, DeliveredRequest request) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("KhÃ´ng tÃ¬m tháº¥y user nháº­n tin"));

        MessengerStatus status = messengerStatusRepository
                .findByMessengerIdAndUserId(request.messageId(), recipient.getId())
                .orElseThrow(() -> new IllegalArgumentException("KhÃ´ng tÃ¬m tháº¥y status cáº§n delivered"));

        if (status.getDeliveredAt() == null) {
            status.setDeliveredAt(java.time.LocalDate.now());
            messengerStatusRepository.save(status);
        }

        Messenger messenger = status.getMessenger();
        DeliveredResponse response = new DeliveredResponse(
                messenger.getId(),
                messenger.getConversation().getId(),
                recipient.getId(),
                recipient.getUserName(),
                status.getDeliveredAt()
        );

        return new DeliveredResult(messenger.getUser().getEmail(), response);
    }

    private SendMessageResult createMessage(User sender, Conversations conversation, MessageRequest request) {
        Long nextSequenceNumber = messengerRepository.findMaxSequenceNumberByConversationId(conversation.getId()) + 1;

        Messenger messenger = new Messenger();
        messenger.setConversation(conversation);
        messenger.setUser(sender);
        messenger.setClientMessageId(request.clientMessageId());
        messenger.setContent(request.content());
        messenger.setSequenceNumber(nextSequenceNumber);
        messenger.setSentAt(LocalDateTime.now());

        Messenger savedMessenger = messengerRepository.save(messenger);
        List<String> recipientDestinations = createStatusesForRecipients(savedMessenger, sender);

        return new SendMessageResult(toResponse(savedMessenger), sender.getEmail(), recipientDestinations);
    }

    private List<String> createStatusesForRecipients(Messenger messenger, User sender) {
        List<MessengerStatus> statuses = conversationMemberRepository
                .findRecipientsByConversationId(messenger.getConversation().getId(), sender.getId())
                .stream()
                .map(member -> {
                    MessengerStatus status = new MessengerStatus();
                    status.setMessenger(messenger);
                    status.setUser(member.getUser());
                    status.setDeliveredAt(null);
                    status.setSeenAt(null);
                    return status;
                })
                .toList();

        messengerStatusRepository.saveAll(statuses);
        return statuses.stream()
                .map(status -> status.getUser().getEmail())
                .toList();
    }

    private MessageResponse toResponse(Messenger messenger) {
        return new MessageResponse(
                messenger.getId(),
                messenger.getConversation().getId(),
                messenger.getClientMessageId(),
                messenger.getSequenceNumber(),
                messenger.getUser().getId(),
                messenger.getUser().getUserName(),
                messenger.getContent(),
                messenger.getSentAt()
        );
    }
}

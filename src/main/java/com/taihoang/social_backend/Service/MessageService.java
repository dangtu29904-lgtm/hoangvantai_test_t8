package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.*;
import com.taihoang.social_backend.dto.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MessageService {
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final MessengerRepository messengerRepository;
    private final MessengerStatusRepository messengerStatusRepository;
    private final MessageUserStateRepository messageUserStateRepository ;
    private final MessageReactionRepository messageReactionRepository ;
    private final ChatUploadRepository
            chatUploadRepository;

    private final MessageAttachmentRepository
            messageAttachmentRepository;
    public MessageService(UserRepository userRepository,
                          ConversationRepository conversationRepository,
                          ConversationMemberRepository conversationMemberRepository,
                          MessengerRepository messengerRepository,
                          MessengerStatusRepository messengerStatusRepository, MessageUserStateRepository messageUserStateRepository, MessageReactionRepository messageReactionRepository, ChatUploadRepository chatUploadRepository, MessageAttachmentRepository messageAttachmentRepository) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.conversationMemberRepository = conversationMemberRepository;
        this.messengerRepository = messengerRepository;
        this.messengerStatusRepository = messengerStatusRepository;
        this.messageUserStateRepository = messageUserStateRepository;
        this.messageReactionRepository = messageReactionRepository;
        this.chatUploadRepository = chatUploadRepository;
        this.messageAttachmentRepository = messageAttachmentRepository;
    }

    @Transactional
    public SendMessageResult handleSendMessage(Long senderId, MessageRequest request) {
        validateMessageContent(request);
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay user gui tin nhan"));

        Conversations conversation = conversationRepository.findByIdForUpdate(request.conversationId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay conversation"));

        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(
                conversation.getId(),
                sender.getId()
        );
        if (!isMember) {
            throw new IllegalArgumentException("User khong thuoc conversation nay");
        }

        return messengerRepository
                .findByConversationIdAndClientMessageId(conversation.getId(), request.clientMessageId())
                .map(message -> {List<MessageAttachment> attachments = messageAttachmentRepository.findByMessageIdWithUpload(message.getId());
                    return new SendMessageResult(
                            toResponse(
                                    message,
                                    attachments
                            ),
                            sender.getEmail(),
                            List.of()
                    );
                })
                .orElseGet(() -> createMessage(sender, conversation, request));
    }

    @Transactional
    public DeliveredResult handleDelivered(Long recipientId, DeliveredRequest request) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay user nhan tin"));

        MessengerStatus status = messengerStatusRepository
                .findByMessengerIdAndUserId(request.messageId(), recipient.getId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay status can delivered"));

        if (status.getDeliveredAt() == null) {
            status.setDeliveredAt(LocalDateTime.now());
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

    @Transactional
    public SeenResult handleSeen(Long recipientId, SeenRequest request) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay user nhan tin"));

        MessengerStatus status = messengerStatusRepository
                .findByMessengerIdAndUserId(request.messageId(), recipient.getId())
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay status can seen"));

        if (status.getDeliveredAt() == null) {
            status.setDeliveredAt(LocalDateTime.now());
        }
        if (status.getSeenAt() == null) {
            LocalDateTime seenAt = LocalDateTime.now();
            status.setSeenAt(seenAt);
            Messenger messenger = status.getMessenger();
            if (messenger.getSeenAt() == null) {
                messenger.setSeenAt(seenAt);
            }
            messengerStatusRepository.save(status);
        }

        Messenger messenger = status.getMessenger();
        SeenResponse response = new SeenResponse(
                messenger.getId(),
                messenger.getConversation().getId(),
                recipient.getId(),
                recipient.getUserName(),
                status.getDeliveredAt(),
                status.getSeenAt()
        );

        return new SeenResult(messenger.getUser().getEmail(), response);
    }

    @Transactional
    public SeenConversationResult handleSeenConversation(Long recipientId, SeenConversationRequest request) {
        User recipient = userRepository.findById(recipientId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay user nhan tin"));

        boolean isMember = conversationMemberRepository.existsByConversationIdAndUserId(
                request.conversationId(),
                recipient.getId()
        );
        if (!isMember) {
            throw new IllegalArgumentException("User khong thuoc conversation nay");
        }

        List<MessengerStatus> statuses = messengerStatusRepository
                .findUnseenByConversationIdAndUserId(request.conversationId(), recipient.getId());

        LocalDateTime seenAt = LocalDateTime.now();
        for (MessengerStatus status : statuses) {
            if (status.getDeliveredAt() == null) {
                status.setDeliveredAt(seenAt);
            }
            status.setSeenAt(seenAt);
            if (status.getMessenger().getSeenAt() == null) {
                status.getMessenger().setSeenAt(seenAt);
            }
        }
        if (!statuses.isEmpty()) {
            messengerStatusRepository.saveAll(statuses);
        }

        SeenConversationResponse response = new SeenConversationResponse(
                request.conversationId(),
                recipient.getId(),
                recipient.getUserName(),
                seenAt,
                statuses.stream()
                        .map(status -> status.getMessenger().getId())
                        .toList()
        );

        String senderDestination = statuses.isEmpty()
                ? null
                : statuses.get(0).getMessenger().getUser().getEmail();

        return new SeenConversationResult(senderDestination, response);
    }
    @Transactional
    public EditMessageResult handleEditMessage(
            Long currentUserId,
            EditMessageRequest request
    ) {
        User currentUser =
                userRepository.findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );
        Messenger messenger =
                messengerRepository.findByIdForUpdate(request.messageId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay tin nhan"
                                )
                        );
        // ============================
        // CHI NGUOI GUI MOI DUOC SUA
        // ============================

        if (!messenger
                .getUser()
                .getId()
                .equals(currentUser.getId())) {
            throw new IllegalArgumentException(
                    "Ban khong co quyen sua tin nhan nay"
            );
        }
        messenger.setContent(
                request.content().trim()
        );

        messenger.setEditedAt(
                LocalDateTime.now()
        );


        Messenger savedMessage =
                messengerRepository.save(messenger);


        EditMessageResponse response =
                new EditMessageResponse(

                        savedMessage.getId(),

                        savedMessage
                                .getConversation()
                                .getId(),

                        savedMessage.getContent(),

                        savedMessage.getEditedAt()
                );

        List<String> destinations =
                conversationMemberRepository
                        .findAllMembersByConversationId(
                                savedMessage
                                        .getConversation()
                                        .getId()
                        )
                        .stream()
                        .map(member ->
                                member.getUser().getEmail()
                        )
                        .toList();
        return new EditMessageResult(
                response,
                destinations
        );
    }
    private SendMessageResult createMessage(

            User sender,

            Conversations conversation,

            MessageRequest request
    ) {

        Long nextSequenceNumber =
                messengerRepository
                        .findMaxSequenceNumberByConversationId(
                                conversation.getId()
                        ) + 1;


        // ======================================
        // REPLY
        // ======================================

        Messenger replyToMessage =
                resolveReplyMessage(
                        conversation,
                        request.replyToMessageId()
                );


        // ======================================
        // CREATE MESSAGE
        // ======================================

        Messenger messenger =
                new Messenger();


        messenger.setConversation(
                conversation
        );

        messenger.setUser(
                sender
        );

        messenger.setClientMessageId(
                request.clientMessageId()
        );


        String normalizedContent =
                request.content() == null
                        ? null
                        : request.content().trim();


        messenger.setContent(
                normalizedContent
        );

        messenger.setSequenceNumber(
                nextSequenceNumber
        );

        messenger.setSentAt(
                LocalDateTime.now()
        );

        messenger.setReplyToMessage(
                replyToMessage
        );


        Messenger savedMessenger =
                messengerRepository
                        .save(messenger);


        // ======================================
        // ATTACHMENTS
        // ======================================

        List<Long> uploadIds =
                normalizeUploadIds(request);


        List<MessageAttachment> attachments =
                createAttachments(
                        savedMessenger,
                        sender,
                        uploadIds
                );


        // ======================================
        // DELIVERED / SEEN STATUS
        // ======================================

        List<String> recipientDestinations =
                createStatusesForRecipients(
                        savedMessenger,
                        sender
                );


        // ======================================
        // RESPONSE
        // ======================================

        return new SendMessageResult(

                toResponse(
                        savedMessenger,
                        attachments
                ),

                sender.getEmail(),

                recipientDestinations
        );
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
    private Messenger resolveReplyMessage(
            Conversations conversation,
            Long replyToMessageId
    ) {

        if (replyToMessageId == null) {
            return null;
        }

        Messenger replyToMessage =
                messengerRepository
                        .findById(replyToMessageId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Tin nhan duoc reply khong ton tai"
                                )
                        );

        if (!replyToMessage
                .getConversation()
                .getId()
                .equals(conversation.getId())) {

            throw new IllegalArgumentException(
                    "Khong the reply tin nhan cua conversation khac"
            );
        }
        return replyToMessage;
    }
    private MessageResponse toResponse(
            Messenger messenger,
            List<MessageAttachment> attachments
    ) {
        ReplyMessageResponse replyResponse = null;
        Messenger replyToMessage =
                messenger.getReplyToMessage();
        boolean recalled =
                replyToMessage.getRecalledAt() != null;

        String replyContent =
                recalled
                        ? null
                        : replyToMessage.getContent();
        if (replyToMessage != null) {
            replyResponse =
                    new ReplyMessageResponse(
                            replyToMessage.getId(),
                            replyToMessage
                                    .getUser()
                                    .getId(),
                            replyToMessage
                                    .getUser()
                                    .getUserName(),
                            replyContent,
                            recalled
                    );
        }
        String visibleContent =
                messenger.getRecalledAt() != null
                        ? null
                        : messenger.getContent();
        List<MessageAttachmentResponse>
                attachmentResponses;


        if (messenger.getRecalledAt() != null) {

            attachmentResponses =
                    List.of();

        } else {

            attachmentResponses =
                    toAttachmentResponses(
                            attachments
                    );
        }
        return new MessageResponse(

                messenger.getId(),

                messenger
                        .getConversation()
                        .getId(),

                messenger.getClientMessageId(),

                messenger.getSequenceNumber(),

                messenger
                        .getUser()
                        .getId(),

                messenger
                        .getUser()
                        .getUserName(),

                visibleContent,

                messenger.getSentAt(),

                replyResponse,

                messenger.getEditedAt(),

                messenger.getRecalledAt(),

                List.of(),

                attachmentResponses
        );
    }
    @Transactional
    public RecallMessageResult handleRecallMessage(
            Long currentUserId,
            RecallMessageRequest request
    ) {
        Messenger messenger =
                messengerRepository
                        .findById(request.messageId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay tin nhan"
                                )
                        );
        // =================================
        // CHI SENDER MOI DUOC THU HOI
        // =================================
        if (!messenger
                .getUser()
                .getId()
                .equals(currentUserId)) {

            throw new IllegalArgumentException(
                    "Ban khong co quyen thu hoi tin nhan nay"
            );
        }
        // =================================
        // IDEMPOTENT
        // =================================
        if (messenger.getRecalledAt() == null) {
            messenger.setRecalledAt(
                    LocalDateTime.now()
            );
            messengerRepository.save(messenger);
        }
        RecallMessageResponse response =
                new RecallMessageResponse(
                        messenger.getId(),
                        messenger
                                .getConversation()
                                .getId(),
                        messenger.getRecalledAt()
                );
        List<String> destinations =
                conversationMemberRepository
                        .findMembersByConversationId(
                                messenger
                                        .getConversation()
                                        .getId()
                        )
                        .stream()
                        .map(member ->
                                member
                                        .getUser()
                                        .getEmail()
                        )
                        .toList();
        return new RecallMessageResult(
                response,
                destinations
        );
    }
    @Transactional
    public DeleteMessageForMeResult
    handleDeleteMessageForMe(
            Long currentUserId,
            DeleteMessageForMeRequest request
    ) {

        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );


        Messenger messenger =
                messengerRepository
                        .findById(request.messageId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay tin nhan"
                                )
                        );


        Long conversationId =
                messenger
                        .getConversation()
                        .getId();


        // ====================================
        // USER PHAI THUOC CONVERSATION
        // ====================================

        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        );
        if (!isMember) {
            throw new IllegalArgumentException(
                    "User khong thuoc conversation nay"
            );
        }
        // ====================================
        // IDEMPOTENT
        // ====================================
        MessageUserState state =
                messageUserStateRepository
                        .findByMessengerIdAndUserId(
                                messenger.getId(),
                                currentUserId
                        )
                        .orElseGet(() -> {
                            MessageUserState newState =
                                    new MessageUserState();

                            newState.setMessenger(messenger);
                            newState.setUser(currentUser);
                            return newState;
                        });
        if (state.getDeletedAt() == null) {
            state.setDeletedAt(
                    LocalDateTime.now()
            );
            messageUserStateRepository.save(state);
        }
        return new DeleteMessageForMeResult(
                currentUser.getEmail(),
                new DeleteMessageForMeResponse(
                        messenger.getId(),
                        conversationId,
                        state.getDeletedAt()
                )
        );
    }
    @Transactional
    public MessageReactionResult handleMessageReaction(
            Long currentUserId,
            MessageReactionRequest request
    ) {
        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );
        Messenger messenger =
                messengerRepository
                        .findById(request.messageId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay tin nhan"
                                )
                        );
        Long conversationId =
                messenger
                        .getConversation()
                        .getId();
        // ======================================
        // CHECK MEMBERSHIP
        // ======================================
        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        );
        if (!isMember) {
            throw new IllegalArgumentException(
                    "User khong thuoc conversation nay"
            );
        }
        // ======================================
        // MESSAGE DA RECALL THI KHONG REACT
        // ======================================
        if (messenger.getRecalledAt() != null) {

            throw new IllegalArgumentException(
                    "Khong the reaction tin nhan da thu hoi"
            );
        }
        // ======================================
        // MESSAGE DA DELETE FOR ME
        // ======================================

        boolean deletedForMe =
                messageUserStateRepository
                        .findByMessengerIdAndUserId(
                                messenger.getId(),
                                currentUserId
                        )
                        .map(state ->
                                state.getDeletedAt() != null
                        )
                        .orElse(false);
        if (deletedForMe) {
            throw new IllegalArgumentException(
                    "Tin nhan da bi xoa o phia ban"
            );
        }
        return applyReaction(
                currentUser,
                messenger,
                request.type()
        );
    }
    private MessageReactionResult applyReaction(
            User currentUser,
            Messenger messenger,
            ReactionType requestedType
    ) {

        Optional<MessageReaction> existingReaction =
                messageReactionRepository
                        .findByMessengerIdAndUserId(
                                messenger.getId(),
                                currentUser.getId()
                        );
        MessageReactionAction action;
        // =====================================
        // CHUA CO REACTION
        // =====================================
        if (existingReaction.isEmpty()) {

            MessageReaction reaction =
                    new MessageReaction();

            reaction.setMessenger(messenger);
            reaction.setUser(currentUser);
            reaction.setType(requestedType);

            messageReactionRepository.save(
                    reaction
            );
            action = MessageReactionAction.ADD;
        }
        // ====================================
        // DA CO REACTION
        // =====================================
        else {
            MessageReaction reaction =
                    existingReaction.get();
            // =============================
            // BAM LAI CUNG REACTION
            // → REMOVE
            // =============================
            if (reaction.getType() == requestedType) {
                messageReactionRepository.delete(
                        reaction
                );
                action =
                        MessageReactionAction.REMOVE;
            }
            // =============================
            // DOI REACTION
            // LOVE → HAHA
            // =============================
            else {
                reaction.setType(requestedType);
                messageReactionRepository.save(
                        reaction
                );
                action =
                        MessageReactionAction.UPDATE;
            }
        }
        return buildReactionResult(
                currentUser,
                messenger,
                requestedType,
                action
        );
    }
    private MessageReactionResult buildReactionResult(
            User currentUser,
            Messenger messenger,
            ReactionType type,
            MessageReactionAction action
    ) {
        Long conversationId =
                messenger
                        .getConversation()
                        .getId();

        MessageReactionResponse response =
                new MessageReactionResponse(
                        messenger.getId(),
                        conversationId,
                        currentUser.getId(),
                        currentUser.getUserName(),
                        type,
                        action
                );
        List<String> destinations =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        )
                        .stream()
                        .map(member ->
                                member
                                        .getUser()
                                        .getEmail()
                        )
                        .toList();


        return new MessageReactionResult(
                response,
                destinations
        );
    }
    private void validateMessageContent(
            MessageRequest request
    ) {

        boolean hasText =
                request.content() != null
                        && !request.content()
                        .trim()
                        .isEmpty();


        boolean hasUploads =
                request.uploadIds() != null
                        && !request.uploadIds()
                        .isEmpty();


        if (!hasText && !hasUploads) {

            throw new IllegalArgumentException(
                    "Tin nhan phai co noi dung hoac file dinh kem"
            );
        }
    }
    private List<Long> normalizeUploadIds(
            MessageRequest request
    ) {

        if (request.uploadIds() == null) {
            return List.of();
        }

        return request.uploadIds();
    }
    private List<ChatUpload> resolveUploads(
            User sender,
            List<Long> uploadIds
    ) {

        if (uploadIds.isEmpty()) {
            return List.of();
        }


        long distinctCount =
                uploadIds
                        .stream()
                        .distinct()
                        .count();


        if (distinctCount != uploadIds.size()) {

            throw new IllegalArgumentException(
                    "uploadIds khong duoc trung nhau"
            );
        }


        List<ChatUpload> uploads =
                chatUploadRepository
                        .findOwnedUploadsForUpdate(
                                uploadIds,
                                sender.getId()
                        );


        // ==================================
        // CO ID KHONG TON TAI / KHONG THUOC USER
        // ==================================

        if (uploads.size() != uploadIds.size()) {

            throw new IllegalArgumentException(
                    "Co file khong ton tai hoac khong thuoc user"
            );
        }


        // ==================================
        // FILE DA DUOC DUNG
        // ==================================

        boolean hasUsedUpload =
                uploads
                        .stream()
                        .anyMatch(upload ->
                                upload.getUsedAt() != null
                        );


        if (hasUsedUpload) {

            throw new IllegalArgumentException(
                    "Co file da duoc su dung cho tin nhan khac"
            );
        }


        return uploads;
    }
    private List<MessageAttachment> createAttachments(
            Messenger messenger,
            User sender,
            List<Long> uploadIds
    ) {
        if (uploadIds.isEmpty()) {
            return List.of();
        }
        // ====================================
        // 1. CHECK + LOCK UPLOADS
        // ====================================
        List<ChatUpload> uploads =
                resolveUploads(
                        sender,
                        uploadIds
                );
        /*
         * Query IN không đảm bảo thứ tự.
         *
         * Chuyển thành Map:
         *
         * uploadId -> ChatUpload
         */
        Map<Long, ChatUpload> uploadById =
                uploads
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        ChatUpload::getId,
                                        upload -> upload
                                )
                        );
        List<MessageAttachment> attachments =
                new ArrayList<>();
        LocalDateTime now =
                LocalDateTime.now();
        // ====================================
        // 2. DUYET DUNG THU TU CLIENT GUI
        // ====================================
        for (
                int i = 0;
                i < uploadIds.size();
                i++
        ) {
            Long uploadId =
                    uploadIds.get(i);
            ChatUpload upload =
                    uploadById.get(uploadId);
            MessageAttachment attachment =
                    new MessageAttachment();
            attachment.setMessenger(
                    messenger
            );
            attachment.setChatUpload(
                    upload
            );
            attachment.setPosition(i
            );
            attachments.add(
                    attachment
            );
            // File da duoc dung
            upload.setUsedAt(
                    now
            );
        }
        // ====================================
        // 3. SAVE
        // ====================================
        List<MessageAttachment> saved =
                messageAttachmentRepository
                        .saveAll(attachments);
        chatUploadRepository
                .saveAll(uploads);


        return saved;
    }
    private List<MessageAttachmentResponse>
    toAttachmentResponses(
            List<MessageAttachment> attachments
    ) {
        return attachments
                .stream()
                .map(attachment -> {
                    ChatUpload upload =
                            attachment.getChatUpload();
                    return new MessageAttachmentResponse(
                            attachment.getId(),
                            upload.getAttachmentType(),
                            upload.getSecureUrl(),
                            upload.getOriginalFileName(),
                            upload.getContentType(),
                            upload.getFileSize()
                    );
                }).toList();
    }
    public TypingResult handleTyping(
            Long currentUserId,
            TypingRequest request
    ) {
        // =========================================
        // 1. TIM USER
        // =========================================
        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );
        // =========================================
        // 2. KIEM TRA CONVERSATION
        // =========================================
        Conversations conversation =
                conversationRepository
                        .findById(request.conversationId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );
        // =========================================
        // 3. CHECK MEMBERSHIP
        // =========================================
        boolean isMember =
                conversationMemberRepository
                        .existsByConversationIdAndUserId(
                                conversation.getId(),
                                currentUserId
                        );
        if (!isMember) {
            throw new IllegalArgumentException(
                    "User khong thuoc conversation nay"
            );
        }
        // =========================================
        // 4. TAO RESPONSE
        // =========================================

        TypingResponse response =
                new TypingResponse(

                        conversation.getId(),

                        currentUser.getId(),

                        currentUser.getUserName(),

                        request.typing()
                );


        // =========================================
        // 5. LAY CAC USER KHAC TRONG CONVERSATION
        // =========================================
        List<String> recipientDestinations =
                conversationMemberRepository
                        .findRecipientsByConversationId(
                                conversation.getId(),
                                currentUserId
                        )
                        .stream()
                        .map(member ->
                                member
                                        .getUser()
                                        .getEmail()
                        )
                        .toList();
        return new TypingResult(
                response,
                recipientDestinations
        );
    }
}

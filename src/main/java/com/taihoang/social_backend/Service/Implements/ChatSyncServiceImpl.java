package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.MessageAttachmentRepository;
import com.taihoang.social_backend.Repository.MessageReactionRepository;
import com.taihoang.social_backend.Repository.MessengerStatusRepository;
import com.taihoang.social_backend.Service.ChatSyncService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatSyncServiceImpl implements ChatSyncService {
    private static final int MAX_LIMIT = 100;

    private final MessengerStatusRepository messengerStatusRepository;
    private final MessageReactionRepository messageReactionRepository ;
    private final MessageAttachmentRepository messageAttachmentRepository;

    /**
     * Lay nhung tin nhan ma thiet bi cua user chua xac nhan delivered.
     */
    @Override
    @Transactional(readOnly = true)
    public ChatSyncResponse syncUndeliveredMessages(
            Long currentUserId,
            Long afterMessageId,
            int requestedLimit
    ) {
        validateRequest(currentUserId, afterMessageId, requestedLimit);

        List<MessengerStatus> queriedStatuses = findSyncPage(
                currentUserId,
                afterMessageId,
                requestedLimit
        );

        boolean hasMore = queriedStatuses.size() > requestedLimit;
        List<MessengerStatus> pageStatuses = takeCurrentPage(
                queriedStatuses,
                requestedLimit,
                hasMore
        );
        List<Messenger> messages =
                pageStatuses
                        .stream()
                        .map(MessengerStatus::getMessenger)
                        .toList();
        List<Long> messageIds =
                messages
                        .stream()
                        .map(Messenger::getId)
                        .toList();
        List<MessageReaction> reactions =
                messageIds.isEmpty()
                        ? List.of()
                        : messageReactionRepository
                        .findByMessageIds(
                                messageIds
                        );
        Map<Long, List<MessageReaction>>
                reactionsByMessageId =
                reactions
                        .stream()
                        .collect(
                                Collectors.groupingBy(
                                        reaction ->
                                                reaction
                                                        .getMessenger()
                                                        .getId()
                                )
                        );

        // ==========================================
        // BULK LOAD ATTACHMENTS
        // ==========================================

        List<MessageAttachment> attachments =
                messageIds.isEmpty()
                        ? List.of()
                        : messageAttachmentRepository
                        .findByMessageIds(
                                messageIds
                        );


        Map<Long, List<MessageAttachment>>
                attachmentsByMessageId =

                attachments
                        .stream()
                        .collect(
                                Collectors.groupingBy(
                                        attachment ->
                                                attachment
                                                        .getMessenger()
                                                        .getId()
                                )
                        );
        List<MessageResponse> items =
                messages
                        .stream()
                        .map(messenger ->
                                toMessageResponse(
                                        messenger,
                                        reactionsByMessageId,
                                        attachmentsByMessageId
                                )
                        )
                        .toList();

        Long nextAfterMessageId = buildNextAfterMessageId(pageStatuses, hasMore);
        return new ChatSyncResponse(items, nextAfterMessageId, hasMore);
    }

    private void validateRequest(
            Long currentUserId,
            Long afterMessageId,
            int limit
    ) {
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException("User dang nhap khong hop le");
        }
        if (afterMessageId != null && afterMessageId < 1) {
            throw new IllegalArgumentException("afterMessageId phai lon hon 0");
        }
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new IllegalArgumentException("limit phai nam trong khoang 1 den " + MAX_LIMIT);
        }
    }

    /**
     * Lay limit + 1 status de biet sau trang hien tai co con du lieu hay khong.
     */
    private List<MessengerStatus> findSyncPage(
            Long currentUserId,
            Long afterMessageId,
            int limit
    ) {
        return messengerStatusRepository.findUndeliveredMessagesForSync(
                currentUserId,
                afterMessageId,
                PageRequest.of(0, limit + 1)
        );
    }

    private List<MessengerStatus> takeCurrentPage(
            List<MessengerStatus> queriedStatuses,
            int limit,
            boolean hasMore
    ) {
        if (!hasMore) {
            return new ArrayList<>(queriedStatuses);
        }
        return new ArrayList<>(queriedStatuses.subList(0, limit));
    }

    private Long buildNextAfterMessageId(
            List<MessengerStatus> pageStatuses,
            boolean hasMore
    ) {
        if (!hasMore || pageStatuses.isEmpty()) {
            return null;
        }
        MessengerStatus lastStatus = pageStatuses.get(pageStatuses.size() - 1);
        return lastStatus.getMessenger().getId();
    }

    private MessageResponse toMessageResponse(
            Messenger messenger,
            Map<Long, List<MessageReaction>>
                    reactionsByMessageId,
            Map<Long, List<MessageAttachment>>
                    attachmentsByMessageId
    ) {
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
        List<MessageAttachment> messageAttachments =
                attachmentsByMessageId
                        .getOrDefault(
                                messenger.getId(),
                                List.of()
                        );
        List<MessageAttachmentResponse>
                attachmentResponses;
        if (messenger.getRecalledAt() != null) {
            // Message đã recall thì không được lộ
            // URL file cũ nữa.
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
                                        upload.getAttachmentType(),
                                        upload.getSecureUrl(),
                                        upload.getOriginalFileName(),
                                        upload.getContentType(),
                                        upload.getFileSize()
                                );
                            })
                            .toList();
        }
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
                attachmentResponses,
                null // storyReference: populated only if message is STORY_REPLY (handled by per-request mapper)
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

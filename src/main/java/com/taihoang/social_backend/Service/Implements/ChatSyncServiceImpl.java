package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Messenger;
import com.taihoang.social_backend.Entity.MessengerStatus;
import com.taihoang.social_backend.Repository.MessengerStatusRepository;
import com.taihoang.social_backend.Service.ChatSyncService;
import com.taihoang.social_backend.dto.ChatSyncResponse;
import com.taihoang.social_backend.dto.MessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatSyncServiceImpl implements ChatSyncService {
    private static final int MAX_LIMIT = 100;

    private final MessengerStatusRepository messengerStatusRepository;

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

        List<MessageResponse> items = pageStatuses.stream()
                .map(MessengerStatus::getMessenger)
                .map(this::toMessageResponse)
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

    private MessageResponse toMessageResponse(Messenger messenger) {
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

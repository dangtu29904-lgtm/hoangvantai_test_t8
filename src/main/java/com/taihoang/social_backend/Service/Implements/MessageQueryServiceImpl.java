package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Messenger;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.MessengerRepository;
import com.taihoang.social_backend.Service.MessageQueryService;
import com.taihoang.social_backend.dto.MessageHistoryResponse;
import com.taihoang.social_backend.dto.MessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageQueryServiceImpl implements MessageQueryService {
    private static final int MAX_LIMIT = 100;

    private final ConversationMemberRepository conversationMemberRepository;
    private final MessengerRepository messengerRepository;

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
        List<MessageResponse> items = toChronologicalResponses(pageMessages);

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
            Long beforeSequence,
            int limit
    ) {
        return messengerRepository.findMessageHistory(
                conversationId,
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
    private List<MessageResponse> toChronologicalResponses(List<Messenger> pageMessages) {
        Collections.reverse(pageMessages);
        return pageMessages.stream()
                .map(this::toMessageResponse)
                .toList();
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

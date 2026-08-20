package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Conversation_Member;
import com.taihoang.social_backend.Entity.Conversations;
import com.taihoang.social_backend.Entity.Messenger;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.ConversationRepository;
import com.taihoang.social_backend.Repository.MessengerRepository;
import com.taihoang.social_backend.Repository.MessengerStatusRepository;
import com.taihoang.social_backend.Service.ConversationQueryService;
import com.taihoang.social_backend.dto.ConversationListResponse;
import com.taihoang.social_backend.dto.ConversationSummaryResponse;
import com.taihoang.social_backend.dto.LastMessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationQueryServiceIMPL implements ConversationQueryService {
    private static final int MAX_LIMIT = 50;

    private final ConversationMemberRepository conversationMemberRepository;
    private final ConversationRepository conversationRepository;
    private final MessengerRepository messengerRepository;
    private final MessengerStatusRepository messengerStatusRepository;

    /**
     * Luong xu ly chinh cua API GET /conversations.
     */
    @Override
    @Transactional
    public ConversationListResponse getConversations(
            Long currentUserId,
            String encodedCursor,
            int requestedLimit
    ) {
        int limit = validateLimit(requestedLimit);
        ConversationCursor cursor = decodeCursor(encodedCursor);

        List<ConversationMemberRepository.ConversationCursorView> queriedRows =
                findConversationPage(currentUserId, cursor, limit);

        boolean hasMore = queriedRows.size() > limit;
        List<ConversationMemberRepository.ConversationCursorView> pageRows =
                takeCurrentPage(queriedRows, limit, hasMore);

        if (pageRows.isEmpty()) {
            return emptyResponse();
        }

        List<Long> conversationIds = getConversationIds(pageRows);
        ConversationPageData pageData = loadPageData(
                currentUserId,
                conversationIds,
                pageRows
        );

        List<ConversationSummaryResponse> items = buildConversationItems(
                currentUserId,
                pageRows,
                pageData
        );
        String nextCursor = buildNextCursor(pageRows, hasMore);

        return new ConversationListResponse(items, nextCursor, hasMore);
    }

    /**
     * Kiem tra limit de tranh client lay qua nhieu du lieu trong mot request.
     */
    private int validateLimit(int limit) {
        if (limit < 1 || limit > MAX_LIMIT) {
            throw new IllegalArgumentException("limit phai nam trong khoang 1 den " + MAX_LIMIT);
        }
        return limit;
    }

    /**
     * Lay limit + 1 dong. Dong du ra duoc dung de xac dinh con trang tiep theo hay khong.
     */
    private List<ConversationMemberRepository.ConversationCursorView> findConversationPage(
            Long currentUserId,
            ConversationCursor cursor,
            int limit
    ) {
        return conversationMemberRepository.findConversationCursors(
                currentUserId,
                cursor == null ? null : cursor.lastMessageId(),
                cursor == null ? null : cursor.conversationId(),
                PageRequest.of(0, limit + 1)
        );
    }

    /**
     * Bo dong thu limit + 1, chi giu dung so phan tu ma client yeu cau.
     */
    private List<ConversationMemberRepository.ConversationCursorView> takeCurrentPage(
            List<ConversationMemberRepository.ConversationCursorView> queriedRows,
            int limit,
            boolean hasMore
    ) {
        return hasMore ? queriedRows.subList(0, limit) : queriedRows;
    }

    private ConversationListResponse emptyResponse() {
        return new ConversationListResponse(List.of(), null, false);
    }

    private List<Long> getConversationIds(
            List<ConversationMemberRepository.ConversationCursorView> pageRows
    ) {
        return pageRows.stream()
                .map(ConversationMemberRepository.ConversationCursorView::getConversationId)
                .toList();
    }

    /**
     * Tai cac nhom du lieu can thiet de tao response cho mot trang conversation.
     */
    private ConversationPageData loadPageData(
            Long currentUserId,
            List<Long> conversationIds,
            List<ConversationMemberRepository.ConversationCursorView> pageRows
    ) {
        return new ConversationPageData(
                loadConversations(conversationIds),
                loadLastMessages(pageRows),
                loadMembers(conversationIds),
                loadUnreadCounts(currentUserId, conversationIds)
        );
    }

    private Map<Long, Conversations> loadConversations(List<Long> conversationIds) {
        return conversationRepository.findAllById(conversationIds)
                .stream()
                .collect(Collectors.toMap(Conversations::getId, Function.identity()));
    }

    private Map<Long, Messenger> loadLastMessages(
            List<ConversationMemberRepository.ConversationCursorView> pageRows
    ) {
        List<Long> lastMessageIds = pageRows.stream()
                .map(ConversationMemberRepository.ConversationCursorView::getLastMessageId)
                .filter(messageId -> messageId != null && messageId > 0)
                .toList();

        return messengerRepository.findAllById(lastMessageIds)
                .stream()
                .collect(Collectors.toMap(Messenger::getId, Function.identity()));
    }

    private Map<Long, List<Conversation_Member>> loadMembers(List<Long> conversationIds) {
        return conversationMemberRepository.findMembersByConversationIds(conversationIds)
                .stream()
                .collect(Collectors.groupingBy(member -> member.getConversation().getId()));
    }

    private Map<Long, Long> loadUnreadCounts(
            Long currentUserId,
            List<Long> conversationIds
    ) {
        return messengerStatusRepository
                .countUnreadByConversationIds(currentUserId, conversationIds)
                .stream()
                .collect(Collectors.toMap(
                        MessengerStatusRepository.ConversationUnreadCountView::getConversationId,
                        MessengerStatusRepository.ConversationUnreadCountView::getUnreadCount
                ));
    }

    /**
     * Giu nguyen thu tu cua pageRows khi chuyen du lieu database thanh DTO.
     */
    private List<ConversationSummaryResponse> buildConversationItems(
            Long currentUserId,
            List<ConversationMemberRepository.ConversationCursorView> pageRows,
            ConversationPageData pageData
    ) {
        List<ConversationSummaryResponse> items = new ArrayList<>();

        for (ConversationMemberRepository.ConversationCursorView row : pageRows) {
            Conversations conversation = pageData.conversationsById()
                    .get(row.getConversationId());
            if (conversation == null) {
                continue;
            }

            Messenger lastMessage = getLastMessage(row, pageData.lastMessagesById());
            List<Conversation_Member> members = pageData.membersByConversationId()
                    .getOrDefault(conversation.getId(), List.of());

            items.add(toConversationSummary(
                    currentUserId,
                    conversation,
                    members,
                    lastMessage,
                    pageData.unreadCounts()
            ));
        }
        return items;
    }

    private Messenger getLastMessage(
            ConversationMemberRepository.ConversationCursorView row,
            Map<Long, Messenger> lastMessagesById
    ) {
        return row.getLastMessageId() == null
                ? null
                : lastMessagesById.get(row.getLastMessageId());
    }

    private ConversationSummaryResponse toConversationSummary(
            Long currentUserId,
            Conversations conversation,
            List<Conversation_Member> members,
            Messenger lastMessage,
            Map<Long, Long> unreadCounts
    ) {
        return new ConversationSummaryResponse(
                conversation.getId(),
                conversation.getType(),
                resolveConversationName(conversation, members, currentUserId),
                null,
                toLastMessageResponse(lastMessage),
                unreadCounts.getOrDefault(conversation.getId(), 0L),
                resolveUpdatedAt(conversation, lastMessage)
        );
    }

    /**
     * Chat rieng dung ten cua nguoi con lai. Entity hien chua co ten nhom nen tam tao theo id.
     */
    private String resolveConversationName(
            Conversations conversation,
            List<Conversation_Member> members,
            Long currentUserId
    ) {
        if (conversation.getType() == Conversations.type_chat.private_chat) {
            return members.stream()
                    .map(Conversation_Member::getUser)
                    .filter(user -> !user.getId().equals(currentUserId))
                    .map(user -> user.getUserName())
                    .findFirst()
                    .orElse("Cuoc tro chuyen");
        }
        return "Nhom chat " + conversation.getId();
    }

    private LastMessageResponse toLastMessageResponse(Messenger messenger) {
        if (messenger == null) {
            return null;
        }
        return new LastMessageResponse(
                messenger.getId(),
                messenger.getContent(),
                messenger.getUser().getId(),
                messenger.getUser().getUserName(),
                messenger.getSequenceNumber(),
                messenger.getSentAt()
        );
    }

    private LocalDateTime resolveUpdatedAt(
            Conversations conversation,
            Messenger lastMessage
    ) {
        if (lastMessage != null) {
            return lastMessage.getSentAt();
        }
        return conversation.getCreateAt() == null
                ? null
                : conversation.getCreateAt().atTime(LocalTime.MIN);
    }

    /**
     * Cursor la Base64 URL-safe cua "lastMessageId:conversationId".
     */
    private ConversationCursor decodeCursor(String encodedCursor) {
        if (encodedCursor == null || encodedCursor.isBlank()) {
            return null;
        }
        try {
            String decoded = new String(
                    Base64.getUrlDecoder().decode(encodedCursor),
                    StandardCharsets.UTF_8
            );
            String[] parts = decoded.split(":", -1);
            if (parts.length != 2) {
                throw new IllegalArgumentException();
            }

            long lastMessageId = Long.parseLong(parts[0]);
            long conversationId = Long.parseLong(parts[1]);
            if (lastMessageId < 0 || conversationId < 1) {
                throw new IllegalArgumentException();
            }
            return new ConversationCursor(lastMessageId, conversationId);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("cursor khong hop le");
        }
    }

    private String buildNextCursor(
            List<ConversationMemberRepository.ConversationCursorView> pageRows,
            boolean hasMore
    ) {
        if (!hasMore || pageRows.isEmpty()) {
            return null;
        }

        ConversationMemberRepository.ConversationCursorView lastRow =
                pageRows.get(pageRows.size() - 1);
        ConversationCursor cursor = new ConversationCursor(
                normalizeLastMessageId(lastRow.getLastMessageId()),
                lastRow.getConversationId()
        );
        return encodeCursor(cursor);
    }

    private String encodeCursor(ConversationCursor cursor) {
        String rawCursor = cursor.lastMessageId() + ":" + cursor.conversationId();
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(rawCursor.getBytes(StandardCharsets.UTF_8));
    }

    private long normalizeLastMessageId(Long lastMessageId) {
        return lastMessageId == null ? 0L : lastMessageId;
    }

    private record ConversationCursor(long lastMessageId, long conversationId) {
    }

    private record ConversationPageData(
            Map<Long, Conversations> conversationsById,
            Map<Long, Messenger> lastMessagesById,
            Map<Long, List<Conversation_Member>> membersByConversationId,
            Map<Long, Long> unreadCounts
    ) {
    }
}

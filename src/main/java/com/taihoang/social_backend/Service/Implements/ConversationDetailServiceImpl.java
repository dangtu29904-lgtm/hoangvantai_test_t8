package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Conversation_Member;
import com.taihoang.social_backend.Entity.Conversations;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.ConversationRepository;
import com.taihoang.social_backend.Service.ConversationDetailService;
import com.taihoang.social_backend.dto.ConversationDetailMemberResponse;
import com.taihoang.social_backend.dto.ConversationDetailResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConversationDetailServiceImpl implements ConversationDetailService {
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;

    /**
     * Lay chi tiet conversation sau khi kiem tra quyen thanh vien.
     */
    @Override
    @Transactional(readOnly = true)
    public ConversationDetailResponse getConversationDetail(
            Long currentUserId,
            Long conversationId
    ) {
        validateRequest(currentUserId, conversationId);

        Conversation_Member currentMembership = findCurrentMembership(
                currentUserId,
                conversationId
        );
        Conversations conversation = findConversation(conversationId);
        List<Conversation_Member> members =
                conversationMemberRepository.findMembersByConversationId(conversationId);

        return toResponse(conversation, currentMembership, members, currentUserId);
    }

    private void validateRequest(Long currentUserId, Long conversationId) {
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException("User dang nhap khong hop le");
        }
        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException("conversationId khong hop le");
        }
    }

    /**
     * Membership vua xac nhan quyen truy cap, vua cho biet role cua user hien tai.
     */
    private Conversation_Member findCurrentMembership(
            Long currentUserId,
            Long conversationId
    ) {
        return conversationMemberRepository
                .findByConversationIdAndUserId(conversationId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User khong thuoc conversation nay"
                ));
    }

    private Conversations findConversation(Long conversationId) {
        return conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Khong tim thay conversation"
                ));
    }

    private ConversationDetailResponse toResponse(
            Conversations conversation,
            Conversation_Member currentMembership,
            List<Conversation_Member> members,
            Long currentUserId
    ) {
        return new ConversationDetailResponse(
                conversation.getId(),
                conversation.getType(),
                resolveConversationName(conversation, members, currentUserId),
                conversation.getCreateAt(),
                normalizeRole(currentMembership.getMemberRole()),
                members.stream()
                        .map(this::toMemberResponse)
                        .toList()
        );
    }

    private String resolveConversationName(
            Conversations conversation,
            List<Conversation_Member> members,
            Long currentUserId
    ) {
        if (conversation.getType() == Conversations.type_chat.private_chat) {
            return members.stream()
                    .filter(member -> !member.getUser().getId().equals(currentUserId))
                    .map(member -> member.getUser().getUserName())
                    .findFirst()
                    .orElse("Cuoc tro chuyen");
        }

        return conversation.getName() == null || conversation.getName().isBlank()
                ? "Nhom chat " + conversation.getId()
                : conversation.getName();
    }

    private ConversationDetailMemberResponse toMemberResponse(
            Conversation_Member member
    ) {
        return new ConversationDetailMemberResponse(
                member.getUser().getId(),
                member.getUser().getUserName(),
                member.getUser().getEmail(),
                member.getJoinAt(),
                normalizeRole(member.getMemberRole())
        );
    }

    /**
     * Du lieu cu co the chua co member_role, khi do mac dinh la MEMBER.
     */
    private Conversation_Member.MemberRole normalizeRole(
            Conversation_Member.MemberRole role
    ) {
        return role == null ? Conversation_Member.MemberRole.MEMBER : role;
    }
}

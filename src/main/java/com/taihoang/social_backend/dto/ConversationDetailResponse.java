package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Conversation_Member;
import com.taihoang.social_backend.Entity.Conversations;

import java.time.LocalDate;
import java.util.List;

public record ConversationDetailResponse(
        Long id,
        Conversations.type_chat type,
        String name,
        LocalDate createdAt,
        Conversation_Member.MemberRole currentUserRole,
        List<ConversationDetailMemberResponse> members
) {
}

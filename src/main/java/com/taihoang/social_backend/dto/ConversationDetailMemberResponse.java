package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Conversation_Member;

import java.time.LocalDate;

public record ConversationDetailMemberResponse(
        Long userId,
        String userName,
        String email,
        LocalDate joinedAt,
        Conversation_Member.MemberRole role
) {
}

package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Conversation_Member;

public record GroupMemberResponse(
        Long userId,
        String userName,
        String email,
        Conversation_Member.MemberRole role
) {
}

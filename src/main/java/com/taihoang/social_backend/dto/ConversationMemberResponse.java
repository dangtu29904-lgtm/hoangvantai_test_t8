package com.taihoang.social_backend.dto;

public record ConversationMemberResponse(
        Long userId,
        String userName,
        String email
) {
}

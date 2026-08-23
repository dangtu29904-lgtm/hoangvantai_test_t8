package com.taihoang.social_backend.dto;

public record MentionedUserResponse(
        Long userId,
        String userName,
        String avatarUrl
) {
}

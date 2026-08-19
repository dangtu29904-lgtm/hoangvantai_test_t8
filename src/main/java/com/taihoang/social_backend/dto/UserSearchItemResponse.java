package com.taihoang.social_backend.dto;

public record UserSearchItemResponse(
        Long id,
        String userName,
        String avatarUrl,
        String bio
) {
}
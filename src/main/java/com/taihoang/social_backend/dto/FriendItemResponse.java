package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record FriendItemResponse(
        Long userId,
        String userName,
        String avatarUrl,
        String bio,
        LocalDateTime friendSince
) {
}
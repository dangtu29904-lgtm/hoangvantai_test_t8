package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record FriendRequestItemResponse(
        Long requestId,
        Long userId,
        String userName,
        String avatarUrl,
        LocalDateTime createdAt
) {
}

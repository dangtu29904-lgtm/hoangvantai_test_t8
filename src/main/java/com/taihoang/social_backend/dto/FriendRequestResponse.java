package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Friendship;

import java.time.LocalDateTime;

public record FriendRequestResponse(
        Long id,
        Long requesterId,
        String requesterName,
        Long receiverId,
        String receiverName,
        Friendship.FriendshipStatus status,
        LocalDateTime createdAt
) {
}
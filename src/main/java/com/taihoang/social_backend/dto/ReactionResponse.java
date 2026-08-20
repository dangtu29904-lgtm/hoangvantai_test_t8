package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;

import java.time.LocalDateTime;

public record ReactionResponse(

        Long id,

        Long postId,

        Long userId,

        String userName,

        String userAvatarUrl,

        ReactionType type,

        LocalDateTime createdAt,

        LocalDateTime updatedAt

) {
}
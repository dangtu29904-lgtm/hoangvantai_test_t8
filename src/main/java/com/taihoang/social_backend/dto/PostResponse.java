package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.PostPrivacy;

import java.time.LocalDateTime;

public record PostResponse(

        Long id,

        Long authorId,

        String authorName,

        String authorAvatarUrl,

        String content,

        PostPrivacy privacy,

        LocalDateTime createdAt,

        LocalDateTime updatedAt
) {
}
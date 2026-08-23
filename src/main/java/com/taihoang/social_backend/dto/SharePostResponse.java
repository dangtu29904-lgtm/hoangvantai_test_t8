package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.PostPrivacy;

import java.time.LocalDateTime;

public record SharePostResponse(

        Long id,

        Long authorId,

        String authorName,

        String content,

        PostPrivacy privacy,

        Long originalPostId,

        LocalDateTime createdAt

) {
}
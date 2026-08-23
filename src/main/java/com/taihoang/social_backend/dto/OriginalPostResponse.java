package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.PostPrivacy;

import java.time.LocalDateTime;
import java.util.List;

public record OriginalPostResponse(

        boolean available,

        Long id,

        Long authorId,

        String authorName,

        String authorAvatarUrl,

        String content,

        PostPrivacy privacy,

        List<PostMediaResponse> media,

        List<MentionedUserResponse> mentions,

        LocalDateTime createdAt

) {
}
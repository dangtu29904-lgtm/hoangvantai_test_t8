package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record CommentResponse(

        Long id,

        Long postId,
        Long parentCommentId ,

        Long authorId,

        String authorName,

        String authorAvatarUrl,

        String content,

        LocalDateTime createdAt,

        LocalDateTime updatedAt

) {
}

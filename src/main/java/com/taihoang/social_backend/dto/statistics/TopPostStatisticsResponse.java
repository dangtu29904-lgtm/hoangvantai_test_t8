package com.taihoang.social_backend.dto.statistics;

import java.time.LocalDateTime;

public record TopPostStatisticsResponse(
        Long postId,
        Long authorId,
        String authorName,
        String contentPreview,
        long reactionCount,
        long commentCount,
        long shareCount,
        long engagementScore,
        LocalDateTime createdAt,
        boolean deleted
) {}

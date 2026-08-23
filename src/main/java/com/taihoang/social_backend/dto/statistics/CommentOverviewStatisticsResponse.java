package com.taihoang.social_backend.dto.statistics;

public record CommentOverviewStatisticsResponse(
        long total,
        long newToday
) {}

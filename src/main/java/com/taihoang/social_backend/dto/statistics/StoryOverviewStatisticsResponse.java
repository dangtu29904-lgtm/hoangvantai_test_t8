package com.taihoang.social_backend.dto.statistics;

public record StoryOverviewStatisticsResponse(
        long total,
        long activeNow,
        long createdToday
) {}

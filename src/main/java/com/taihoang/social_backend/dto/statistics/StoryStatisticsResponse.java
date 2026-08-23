package com.taihoang.social_backend.dto.statistics;

public record StoryStatisticsResponse(
        long totalStories,
        long activeNow,
        long expired,
        long deleted,
        long createdToday,
        long totalViews,
        long totalReactions
) {}

package com.taihoang.social_backend.dto.statistics;

public record ActiveUserStatisticsResponse(
        Long userId,
        String userName,
        String avatarUrl,
        long posts,
        long comments,
        long messages,
        long stories,
        long activityScore
) {}

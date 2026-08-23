package com.taihoang.social_backend.dto.statistics;

public record PostOverviewStatisticsResponse(
        long total,
        long active,
        long deleted,
        long newToday
) {}

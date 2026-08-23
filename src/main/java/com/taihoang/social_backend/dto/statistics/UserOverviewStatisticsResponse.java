package com.taihoang.social_backend.dto.statistics;

public record UserOverviewStatisticsResponse(
        long total,
        long active,
        long suspended,
        long newToday
) {}

package com.taihoang.social_backend.dto.statistics;

public record ReportOverviewStatisticsResponse(
        long pending,
        long reviewing,
        long resolved,
        long rejected
) {}

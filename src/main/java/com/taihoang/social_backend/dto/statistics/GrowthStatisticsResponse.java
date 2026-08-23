package com.taihoang.social_backend.dto.statistics;

import java.time.LocalDate;
import java.util.List;

public record GrowthStatisticsResponse(
        StatisticMetric metric,
        String period,
        LocalDate from,
        LocalDate to,
        long total,
        List<DailyStatisticResponse> items
) {}

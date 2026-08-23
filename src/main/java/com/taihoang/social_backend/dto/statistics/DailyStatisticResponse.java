package com.taihoang.social_backend.dto.statistics;

import java.time.LocalDate;

public record DailyStatisticResponse(
        LocalDate date,
        long count
) {}

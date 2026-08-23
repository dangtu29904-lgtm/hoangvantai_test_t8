package com.taihoang.social_backend.dto.statistics;

import java.time.LocalDate;

public interface DailyCountProjection {
    LocalDate getDate();
    Long getCount();
}

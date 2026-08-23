package com.taihoang.social_backend.dto.statistics;

public enum StatisticPeriod {
    SEVEN_DAYS(7),
    THIRTY_DAYS(30),
    NINETY_DAYS(90);

    private final int days;

    StatisticPeriod(int days) {
        this.days = days;
    }

    public int getDays() {
        return days;
    }
}

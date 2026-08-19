package com.taihoang.social_backend.dto;

public record NotificationReadResponse(
        Long notificationId,
        boolean read
) {
}
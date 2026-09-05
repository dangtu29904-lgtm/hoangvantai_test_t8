package com.taihoang.social_backend.dto;

import java.time.Instant;

public record ChatErrorResponse(
        String code,
        String message,
        Instant timestamp,
        String clientMessageId,
        Long conversationId,
        Long retryAfterSeconds
) {
    public ChatErrorResponse(String code, String message, Instant timestamp) {
        this(code, message, timestamp, null, null, null);
    }
}

package com.taihoang.social_backend.dto;

import java.time.Instant;

public record ChatErrorResponse(
        String code,
        String message,
        Instant timestamp
) {
}

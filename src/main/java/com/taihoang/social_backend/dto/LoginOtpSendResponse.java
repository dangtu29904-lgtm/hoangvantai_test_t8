package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record LoginOtpSendResponse(
        String message,
        LocalDateTime expiresAt,
        String debugOtp
) {
}

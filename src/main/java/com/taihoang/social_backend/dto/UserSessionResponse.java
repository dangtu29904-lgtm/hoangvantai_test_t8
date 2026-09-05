package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.UserSession;

import java.time.LocalDateTime;

public record UserSessionResponse(
        Long id,
        Long userDeviceId,
        String deviceId,
        String deviceName,
        String deviceType,
        String browser,
        String os,
        boolean trusted,
        String ipAddress,
        String userAgent,
        LocalDateTime createdAt,
        LocalDateTime lastActiveAt,
        LocalDateTime expiresAt,
        LocalDateTime revokedAt,
        UserSession.Status status,
        boolean current
) {
}

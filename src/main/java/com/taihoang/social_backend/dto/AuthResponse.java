package com.taihoang.social_backend.dto;

public record AuthResponse(
        String token,
        String tokenType,
        Long userId,
        String userName,
        String email,
        String avatarUrl,
        String coverUrl,
        String role,
        String refreshToken,
        Long userSessionId,
        String loginStatus,
        String approvalToken,
        Integer riskScore,
        java.time.LocalDateTime approvalExpiresAt
) {
}

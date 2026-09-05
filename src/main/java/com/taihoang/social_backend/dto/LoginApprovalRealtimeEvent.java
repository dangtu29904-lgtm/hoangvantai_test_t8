package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record LoginApprovalRealtimeEvent(
        Long approvalRequestId,
        String deviceName,
        String deviceType,
        String browser,
        String os,
        String ipAddress,
        int riskScore,
        LocalDateTime expiresAt
) {
}

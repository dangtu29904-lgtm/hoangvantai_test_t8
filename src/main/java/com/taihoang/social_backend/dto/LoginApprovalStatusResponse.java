package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.LoginApprovalRequest;

import java.time.LocalDateTime;

public record LoginApprovalStatusResponse(
        LoginApprovalRequest.Status status,
        int riskScore,
        LocalDateTime expiresAt,
        AuthResponse auth
) {
}

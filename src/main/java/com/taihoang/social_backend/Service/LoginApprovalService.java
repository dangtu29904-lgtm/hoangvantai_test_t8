package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Entity.UserDevice;
import com.taihoang.social_backend.dto.AuthResponse;
import com.taihoang.social_backend.dto.LoginApprovalStatusResponse;
import com.taihoang.social_backend.dto.LoginOtpSendResponse;
import com.taihoang.social_backend.dto.LoginOtpVerifyRequest;

public interface LoginApprovalService {

    AuthResponse createPendingApproval(
            User user,
            UserDevice userDevice,
            int riskScore,
            String ipAddress,
            String userAgent,
            boolean trustedApprovalAvailable
    );

    LoginApprovalStatusResponse getStatus(String approvalToken);

    LoginOtpSendResponse sendOtp(String approvalToken);

    LoginApprovalStatusResponse verifyOtp(String approvalToken, LoginOtpVerifyRequest request);

    void approve(Long currentUserId, Long approvalRequestId);

    void reject(Long currentUserId, Long approvalRequestId);
}

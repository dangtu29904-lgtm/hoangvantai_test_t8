package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Entity.UserDevice;
import com.taihoang.social_backend.dto.AuthResponse;
import com.taihoang.social_backend.dto.UserSessionResponse;

import java.util.List;

public interface UserSessionService {

    AuthResponse createLoginSession(
            User user,
            UserDevice userDevice,
            String ipAddress,
            String userAgent
    );

    AuthResponse refresh(String refreshToken);

    void revoke(String refreshToken);

    List<UserSessionResponse> getUserSessions(Long userId, Long currentSessionId);

    void revokeSession(Long userId, Long sessionId);

    void revokeOtherSessions(Long userId, Long currentSessionId);

    boolean isAccessSessionValid(Long userId, Long sessionId);

    boolean hasActiveSession(Long userId);

    boolean hasActiveTrustedSession(Long userId);
}

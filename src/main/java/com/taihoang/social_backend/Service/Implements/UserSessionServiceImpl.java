package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Entity.UserDevice;
import com.taihoang.social_backend.Entity.UserSession;
import com.taihoang.social_backend.Entity.UserStatus;
import com.taihoang.social_backend.Repository.UserSessionRepository;
import com.taihoang.social_backend.Service.UserSessionService;
import com.taihoang.social_backend.dto.AuthResponse;
import com.taihoang.social_backend.dto.UserSessionResponse;
import com.taihoang.social_backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserSessionServiceImpl implements UserSessionService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserSessionRepository userSessionRepository;
    private final JwtService jwtService;

    @Value("${app.refresh-token.expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    @Override
    @Transactional
    public AuthResponse createLoginSession(
            User user,
            UserDevice userDevice,
            String ipAddress,
            String userAgent
    ) {
        String refreshToken = generateRefreshToken();
        UserSession session = new UserSession();
        session.setUser(user);
        session.setUserDevice(userDevice);
        session.setRefreshTokenHash(hashToken(refreshToken));
        session.setIpAddress(normalize(ipAddress, 45));
        session.setUserAgent(normalize(userAgent, 1000));
        session.setLastActiveAt(LocalDateTime.now());
        session.setExpiresAt(LocalDateTime.now().plus(Duration.ofMillis(refreshTokenExpirationMs)));
        session.setStatus(UserSession.Status.ACTIVE);

        UserSession saved = userSessionRepository.save(session);
        return toAuthResponse(user, saved.getId(), refreshToken);
    }

    @Override
    @Transactional
    public AuthResponse refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new BadCredentialsException("refreshToken khong hop le");
        }

        UserSession session = userSessionRepository
                .findByRefreshTokenHashForUpdate(hashToken(refreshToken))
                .orElseThrow(() -> new BadCredentialsException("refreshToken khong hop le"));

        ensureSessionActive(session);

        String nextRefreshToken = generateRefreshToken();
        session.setRefreshTokenHash(hashToken(nextRefreshToken));
        session.setLastActiveAt(LocalDateTime.now());
        userSessionRepository.save(session);

        return toAuthResponse(session.getUser(), session.getId(), nextRefreshToken);
    }

    @Override
    @Transactional
    public void revoke(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }

        userSessionRepository.findByRefreshTokenHashForUpdate(hashToken(refreshToken))
                .ifPresent(session -> {
                    if (session.getStatus() == UserSession.Status.ACTIVE) {
                        session.setStatus(UserSession.Status.REVOKED);
                        session.setRevokedAt(LocalDateTime.now());
                        userSessionRepository.save(session);
                    }
                });
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserSessionResponse> getUserSessions(Long userId, Long currentSessionId) {
        return userSessionRepository.findAllByUserId(userId)
                .stream()
                .map(session -> toUserSessionResponse(session, currentSessionId))
                .toList();
    }

    @Override
    @Transactional
    public void revokeSession(Long userId, Long sessionId) {
        UserSession session = userSessionRepository
                .findByIdAndUserIdForUpdate(sessionId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay session"));

        revokeSession(session);
    }

    @Override
    @Transactional
    public void revokeOtherSessions(Long userId, Long currentSessionId) {
        if (currentSessionId == null) {
            throw new BadCredentialsException("Token hien tai khong co session id");
        }

        userSessionRepository
                .findActiveOtherSessionsForUpdate(userId, currentSessionId, UserSession.Status.ACTIVE)
                .forEach(this::revokeSession);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAccessSessionValid(Long userId, Long sessionId) {
        if (userId == null || sessionId == null) {
            return false;
        }

        return userSessionRepository.existsActiveSession(
                sessionId,
                userId,
                UserSession.Status.ACTIVE,
                LocalDateTime.now()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveSession(Long userId) {
        if (userId == null || userId <= 0) {
            return false;
        }

        return userSessionRepository.existsActiveSessionForUser(
                userId,
                UserSession.Status.ACTIVE,
                LocalDateTime.now()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveTrustedSession(Long userId) {
        if (userId == null || userId <= 0) {
            return false;
        }

        return userSessionRepository.existsActiveTrustedSessionForUser(
                userId,
                UserSession.Status.ACTIVE,
                LocalDateTime.now()
        );
    }

    private void ensureSessionActive(UserSession session) {
        if (session.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new BadCredentialsException("Tai khoan khong con hoat dong");
        }

        if (session.getStatus() != UserSession.Status.ACTIVE || session.getRevokedAt() != null) {
            throw new BadCredentialsException("Session da bi thu hoi");
        }

        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setStatus(UserSession.Status.EXPIRED);
            userSessionRepository.save(session);
            throw new BadCredentialsException("Session da het han");
        }
    }

    private void revokeSession(UserSession session) {
        if (session.getStatus() == UserSession.Status.REVOKED) {
            return;
        }

        session.setStatus(UserSession.Status.REVOKED);
        session.setRevokedAt(LocalDateTime.now());
        userSessionRepository.save(session);
    }

    private UserSessionResponse toUserSessionResponse(
            UserSession session,
            Long currentSessionId
    ) {
        UserDevice device = session.getUserDevice();

        return new UserSessionResponse(
                session.getId(),
                device == null ? null : device.getId(),
                device == null ? null : device.getDeviceId(),
                device == null ? null : device.getDeviceName(),
                device == null ? null : device.getDeviceType(),
                device == null ? null : device.getBrowser(),
                device == null ? null : device.getOs(),
                device != null && device.isTrusted(),
                session.getIpAddress(),
                session.getUserAgent(),
                session.getCreatedAt(),
                session.getLastActiveAt(),
                session.getExpiresAt(),
                session.getRevokedAt(),
                session.getStatus(),
                session.getId().equals(currentSessionId)
        );
    }

    private AuthResponse toAuthResponse(User user, Long userSessionId, String refreshToken) {
        String token = jwtService.generateToken(
                user.getEmail(),
                user.getRole().name(),
                userSessionId
        );

        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getUserName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getRole().name(),
                refreshToken,
                userSessionId,
                "SUCCESS",
                null,
                null,
                null
        );
    }

    private String generateRefreshToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Khong the hash refresh token", exception);
        }
    }

    private String normalize(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }

        return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
    }
}

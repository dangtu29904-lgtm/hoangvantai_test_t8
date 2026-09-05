package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.LoginApprovalRequest;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Entity.UserDevice;
import com.taihoang.social_backend.Repository.LoginApprovalRequestRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.EmailService;
import com.taihoang.social_backend.Service.LoginApprovalService;
import com.taihoang.social_backend.Service.NotificationService;
import com.taihoang.social_backend.Service.UserSessionService;
import com.taihoang.social_backend.dto.AuthResponse;
import com.taihoang.social_backend.dto.LoginApprovalRealtimeEvent;
import com.taihoang.social_backend.dto.LoginApprovalStatusResponse;
import com.taihoang.social_backend.dto.LoginOtpSendResponse;
import com.taihoang.social_backend.dto.LoginOtpVerifyRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class LoginApprovalServiceImpl implements LoginApprovalService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int OTP_MAX_ATTEMPTS = 5;

    private final LoginApprovalRequestRepository loginApprovalRequestRepository;
    private final UserRepository userRepository;
    private final UserSessionService userSessionService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;
    private final EmailService emailService;

    @Value("${app.login-approval.expiration-ms:300000}")
    private long approvalExpirationMs;

    @Value("${app.login-approval.otp.email-enabled:false}")
    private boolean otpEmailEnabled;

    @Value("${app.login-approval.otp.debug-enabled:true}")
    private boolean otpDebugEnabled;

    @Override
    @Transactional
    public AuthResponse createPendingApproval(
            User user,
            UserDevice userDevice,
            int riskScore,
            String ipAddress,
            String userAgent,
            boolean trustedApprovalAvailable
    ) {
        LocalDateTime now = LocalDateTime.now();
        String approvalToken = generateApprovalToken();

        LoginApprovalRequest request = new LoginApprovalRequest();
        request.setUser(user);
        request.setUserDevice(userDevice);
        request.setApprovalToken(approvalToken);
        request.setRiskScore(riskScore);
        request.setIpAddress(normalize(ipAddress, 45));
        request.setUserAgent(normalize(userAgent, 1000));
        request.setExpiresAt(now.plus(Duration.ofMillis(approvalExpirationMs)));
        request.setStatus(LoginApprovalRequest.Status.PENDING);

        LoginApprovalRequest saved = loginApprovalRequestRepository.save(request);
        if (trustedApprovalAvailable) {
            publishApprovalRequestAfterCommit(saved);
        }

        return new AuthResponse(
                null,
                null,
                user.getId(),
                user.getUserName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getRole().name(),
                null,
                null,
                trustedApprovalAvailable ? "PENDING_APPROVAL_OR_OTP" : "PENDING_OTP",
                approvalToken,
                riskScore,
                saved.getExpiresAt()
        );
    }

    @Override
    @Transactional
    public LoginApprovalStatusResponse getStatus(String approvalToken) {
        if (approvalToken == null || approvalToken.isBlank()) {
            throw new BadCredentialsException("approvalToken khong hop le");
        }

        LoginApprovalRequest request = loginApprovalRequestRepository
                .findByApprovalTokenForUpdate(approvalToken)
                .orElseThrow(() -> new BadCredentialsException("approvalToken khong hop le"));

        expireIfNeeded(request);

        if (request.getStatus() == LoginApprovalRequest.Status.APPROVED && request.getConsumedAt() == null) {
            AuthResponse auth = userSessionService.createLoginSession(
                    request.getUser(),
                    request.getUserDevice(),
                    request.getIpAddress(),
                    request.getUserAgent()
            );
            request.setConsumedAt(LocalDateTime.now());
            request.setStatus(LoginApprovalRequest.Status.CONSUMED);
            loginApprovalRequestRepository.save(request);
            notificationService.notifySecurityLogin(request.getUser(), request.getUserDevice());

            return new LoginApprovalStatusResponse(
                    LoginApprovalRequest.Status.APPROVED,
                    request.getRiskScore(),
                    request.getExpiresAt(),
                    auth
            );
        }

        return new LoginApprovalStatusResponse(
                request.getStatus(),
                request.getRiskScore(),
                request.getExpiresAt(),
                null
        );
    }

    @Override
    @Transactional
    public LoginOtpSendResponse sendOtp(String approvalToken) {
        LoginApprovalRequest request = findPendingByToken(approvalToken);

        String otp = generateOtp();
        request.setOtpHash(hashOtp(request.getApprovalToken(), otp));
        request.setOtpSentAt(LocalDateTime.now());
        request.setOtpVerifiedAt(null);
        request.setOtpAttempts(0);
        loginApprovalRequestRepository.save(request);

        if (otpEmailEnabled) {
            emailService.sendLoginOtp(request.getUser().getEmail(), otp);
        }

        return new LoginOtpSendResponse(
                otpEmailEnabled
                        ? "OTP da duoc gui den email cua ban."
                        : "OTP da duoc tao. Moi truong dev dang tra ve debugOtp de test.",
                request.getExpiresAt(),
                otpDebugEnabled ? otp : null
        );
    }

    @Override
    @Transactional
    public LoginApprovalStatusResponse verifyOtp(String approvalToken, LoginOtpVerifyRequest verifyRequest) {
        LoginApprovalRequest request = findPendingByToken(approvalToken);

        if (request.getOtpHash() == null || request.getOtpSentAt() == null) {
            throw new BadCredentialsException("Chua gui OTP cho yeu cau dang nhap nay");
        }

        if (request.getOtpAttempts() >= OTP_MAX_ATTEMPTS) {
            request.setStatus(LoginApprovalRequest.Status.REJECTED);
            request.setDecidedAt(LocalDateTime.now());
            loginApprovalRequestRepository.save(request);
            throw new BadCredentialsException("OTP da vuot qua so lan thu cho phep");
        }

        String expectedHash = hashOtp(request.getApprovalToken(), verifyRequest.otp());
        if (!expectedHash.equals(request.getOtpHash())) {
            request.setOtpAttempts(request.getOtpAttempts() + 1);
            loginApprovalRequestRepository.save(request);
            throw new BadCredentialsException("OTP khong dung");
        }

        if (Boolean.TRUE.equals(verifyRequest.trustDevice()) && request.getUserDevice() != null) {
            request.getUserDevice().setTrusted(true);
        }

        AuthResponse auth = userSessionService.createLoginSession(
                request.getUser(),
                request.getUserDevice(),
                request.getIpAddress(),
                request.getUserAgent()
        );
        request.setOtpVerifiedAt(LocalDateTime.now());
        request.setConsumedAt(LocalDateTime.now());
        request.setStatus(LoginApprovalRequest.Status.CONSUMED);
        loginApprovalRequestRepository.save(request);
        notificationService.notifySecurityLogin(request.getUser(), request.getUserDevice());

        return new LoginApprovalStatusResponse(
                LoginApprovalRequest.Status.APPROVED,
                request.getRiskScore(),
                request.getExpiresAt(),
                auth
        );
    }

    @Override
    @Transactional
    public void approve(Long currentUserId, Long approvalRequestId) {
        LoginApprovalRequest request = findPendingRequest(currentUserId, approvalRequestId);
        request.setStatus(LoginApprovalRequest.Status.APPROVED);
        request.setDecidedAt(LocalDateTime.now());
        request.setDecidedBy(userRepository.getReferenceById(currentUserId));
        loginApprovalRequestRepository.save(request);
    }

    @Override
    @Transactional
    public void reject(Long currentUserId, Long approvalRequestId) {
        LoginApprovalRequest request = findPendingRequest(currentUserId, approvalRequestId);
        request.setStatus(LoginApprovalRequest.Status.REJECTED);
        request.setDecidedAt(LocalDateTime.now());
        request.setDecidedBy(userRepository.getReferenceById(currentUserId));
        loginApprovalRequestRepository.save(request);
    }

    private LoginApprovalRequest findPendingRequest(Long currentUserId, Long approvalRequestId) {
        if (currentUserId == null || currentUserId <= 0) {
            throw new BadCredentialsException("Chua dang nhap");
        }

        LoginApprovalRequest request = loginApprovalRequestRepository
                .findByIdAndUserIdForUpdate(approvalRequestId, currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay yeu cau duyet dang nhap"));

        expireIfNeeded(request);
        if (request.getStatus() != LoginApprovalRequest.Status.PENDING) {
            throw new IllegalArgumentException("Yeu cau duyet khong con cho xu ly");
        }

        return request;
    }

    private LoginApprovalRequest findPendingByToken(String approvalToken) {
        if (approvalToken == null || approvalToken.isBlank()) {
            throw new BadCredentialsException("approvalToken khong hop le");
        }

        LoginApprovalRequest request = loginApprovalRequestRepository
                .findByApprovalTokenForUpdate(approvalToken)
                .orElseThrow(() -> new BadCredentialsException("approvalToken khong hop le"));

        expireIfNeeded(request);
        if (request.getStatus() != LoginApprovalRequest.Status.PENDING) {
            throw new BadCredentialsException("Yeu cau dang nhap khong con cho xu ly");
        }

        return request;
    }

    private void expireIfNeeded(LoginApprovalRequest request) {
        if (request.getStatus() == LoginApprovalRequest.Status.PENDING
                && request.getExpiresAt().isBefore(LocalDateTime.now())) {
            request.setStatus(LoginApprovalRequest.Status.EXPIRED);
            request.setDecidedAt(LocalDateTime.now());
            loginApprovalRequestRepository.save(request);
        }
    }

    private void publishApprovalRequestAfterCommit(LoginApprovalRequest request) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            publishApprovalRequest(request);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publishApprovalRequest(request);
            }
        });
    }

    private void publishApprovalRequest(LoginApprovalRequest request) {
        UserDevice device = request.getUserDevice();
        messagingTemplate.convertAndSendToUser(
                request.getUser().getEmail(),
                "/queue/security.login-approvals",
                new LoginApprovalRealtimeEvent(
                        request.getId(),
                        device == null ? null : device.getDeviceName(),
                        device == null ? null : device.getDeviceType(),
                        device == null ? null : device.getBrowser(),
                        device == null ? null : device.getOs(),
                        request.getIpAddress(),
                        request.getRiskScore(),
                        request.getExpiresAt()
                )
        );
    }

    private String generateApprovalToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private String hashOtp(String approvalToken, String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((approvalToken + ":" + otp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception exception) {
            throw new IllegalStateException("Khong the hash OTP", exception);
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

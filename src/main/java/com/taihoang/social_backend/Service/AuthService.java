package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Entity.UserDevice;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.dto.AuthResponse;
import com.taihoang.social_backend.dto.LoginRequest;
import com.taihoang.social_backend.dto.LogoutRequest;
import com.taihoang.social_backend.dto.RefreshTokenRequest;
import com.taihoang.social_backend.dto.RegisterRequest;
import com.taihoang.social_backend.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDeviceService userDeviceService;
    private final UserSessionService userSessionService;
    private final LoginApprovalService loginApprovalService;
    private final NotificationService notificationService;
    private final PresenceService presenceService;

    @Value("${app.login-approval.risk-threshold:70}")
    private int loginApprovalRiskThreshold;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            UserDeviceService userDeviceService,
            UserSessionService userSessionService,
            LoginApprovalService loginApprovalService,
            NotificationService notificationService,
            PresenceService presenceService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userDeviceService = userDeviceService;
        this.userSessionService = userSessionService;
        this.loginApprovalService = loginApprovalService;
        this.notificationService = notificationService;
        this.presenceService = presenceService;
    }

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email da ton tai");
        }

        User user = new User();
        user.setUserName(request.userName());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(User.Role.USER);
        user.setCreatAt(LocalDate.now());

        User savedUser = userRepository.save(user);
        return toAuthResponse(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        return login(request, null);
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
        } catch (BadCredentialsException exception) {
            throw new BadCredentialsException("Email hoac password khong dung");
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Email hoac password khong dung"));

        String ipAddress = extractClientIp(httpRequest);
        String userAgent = httpRequest == null ? null : httpRequest.getHeader("User-Agent");
        Optional<UserDevice> existingDevice = userDeviceService.findByBrowserDeviceId(
                user.getId(),
                request.deviceId()
        );
        int riskScore = calculateRiskScore(existingDevice, ipAddress);
        boolean trustedCurrentDevice = existingDevice
                .map(UserDevice::isTrusted)
                .orElse(false);

        UserDevice userDevice = userDeviceService.recordLoginDevice(
                user,
                request,
                ipAddress,
                userAgent
        );

        boolean needsChallenge = !trustedCurrentDevice
                && riskScore >= loginApprovalRiskThreshold;

        if (needsChallenge) {
            boolean trustedApprovalAvailable = hasOnlineTrustedDevice(user.getId());
            return loginApprovalService.createPendingApproval(
                    user,
                    userDevice,
                    riskScore,
                    ipAddress,
                    userAgent,
                    trustedApprovalAvailable
            );
        }

        AuthResponse response = userSessionService.createLoginSession(
                user,
                userDevice,
                ipAddress,
                userAgent
        );

        if (existingDevice.isEmpty()) {
            notificationService.notifySecurityLogin(user, userDevice);
        }

        return response;
    }

    private boolean hasOnlineTrustedDevice(Long userId) {
        if (!userSessionService.hasActiveTrustedSession(userId)) {
            return false;
        }

        try {
            return "online".equalsIgnoreCase(presenceService.getPresence(userId).status());
        } catch (Exception exception) {
            return false;
        }
    }

    public AuthResponse refresh(RefreshTokenRequest request) {
        return userSessionService.refresh(request.refreshToken());
    }

    public void logout(LogoutRequest request) {
        if (request == null) {
            return;
        }

        userSessionService.revoke(request.refreshToken());
    }

    private AuthResponse toAuthResponse(User user) {
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getUserName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getRole().name(),
                null,
                null,
                "SUCCESS",
                null,
                null,
                null
        );
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String forwarded = request.getHeader("Forwarded");
        String parsedForwarded = parseForwardedFor(forwarded);
        if (parsedForwarded != null) {
            return parsedForwarded;
        }

        return request.getRemoteAddr();
    }

    private int calculateRiskScore(Optional<UserDevice> existingDevice, String ipAddress) {
        if (existingDevice.isEmpty()) {
            return 80;
        }

        UserDevice device = existingDevice.get();
        int riskScore = device.isTrusted() ? 10 : 75;

        if (ipAddress != null
                && device.getLastIp() != null
                && !ipAddress.equals(device.getLastIp())) {
            riskScore += 20;
        }

        return Math.min(riskScore, 100);
    }

    private String parseForwardedFor(String forwarded) {
        if (forwarded == null || forwarded.isBlank()) {
            return null;
        }

        String[] parts = forwarded.split(";");
        for (String part : parts) {
            String trimmed = part.trim();
            if (trimmed.toLowerCase().startsWith("for=")) {
                String value = trimmed.substring(4).trim();
                return value.replace("\"", "");
            }
        }

        return null;
    }
}

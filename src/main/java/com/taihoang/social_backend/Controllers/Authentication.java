package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.AuthService;
import com.taihoang.social_backend.Service.LoginApprovalService;
import com.taihoang.social_backend.dto.AuthResponse;
import com.taihoang.social_backend.dto.LoginApprovalStatusResponse;
import com.taihoang.social_backend.dto.LoginOtpSendResponse;
import com.taihoang.social_backend.dto.LoginOtpVerifyRequest;
import com.taihoang.social_backend.dto.LoginRequest;
import com.taihoang.social_backend.dto.LogoutRequest;
import com.taihoang.social_backend.dto.RefreshTokenRequest;
import com.taihoang.social_backend.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class Authentication {
    private final AuthService authService;
    private final LoginApprovalService loginApprovalService;

    public Authentication(AuthService authService, LoginApprovalService loginApprovalService) {
        this.authService = authService;
        this.loginApprovalService = loginApprovalService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        return authService.login(request, httpRequest);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/login-approvals/{approvalToken}/status")
    public LoginApprovalStatusResponse getLoginApprovalStatus(
            @PathVariable String approvalToken
    ) {
        return loginApprovalService.getStatus(approvalToken);
    }

    @PostMapping("/login-approvals/{approvalToken}/otp/send")
    public LoginOtpSendResponse sendLoginOtp(
            @PathVariable String approvalToken
    ) {
        return loginApprovalService.sendOtp(approvalToken);
    }

    @PostMapping("/login-approvals/{approvalToken}/otp/verify")
    public LoginApprovalStatusResponse verifyLoginOtp(
            @PathVariable String approvalToken,
            @Valid @RequestBody LoginOtpVerifyRequest request
    ) {
        return loginApprovalService.verifyOtp(approvalToken, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(exception.getMessage());
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<String> handleBadCredentials(BadCredentialsException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(exception.getMessage());
    }
}

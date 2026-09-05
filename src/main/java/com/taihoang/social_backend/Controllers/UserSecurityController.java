package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.UserSessionService;
import com.taihoang.social_backend.Service.UserDeviceService;
import com.taihoang.social_backend.Service.LoginApprovalService;
import com.taihoang.social_backend.dto.UserSessionResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import com.taihoang.social_backend.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/user/security")
@RequiredArgsConstructor
public class UserSecurityController {

    private final UserSessionService userSessionService;
    private final UserDeviceService userDeviceService;
    private final LoginApprovalService loginApprovalService;
    private final JwtService jwtService;

    @GetMapping("/sessions")
    public List<UserSessionResponse> getSessions(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            HttpServletRequest request
    ) {
        validateAuthentication(currentUser);
        return userSessionService.getUserSessions(
                currentUser.getId(),
                extractCurrentSessionId(request)
        );
    }

    @DeleteMapping("/sessions/others")
    public ResponseEntity<Void> revokeOtherSessions(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            HttpServletRequest request
    ) {
        validateAuthentication(currentUser);
        userSessionService.revokeOtherSessions(
                currentUser.getId(),
                extractCurrentSessionId(request)
        );
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long sessionId
    ) {
        validateAuthentication(currentUser);
        userSessionService.revokeSession(currentUser.getId(), sessionId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/devices/{userDeviceId}/trust")
    public ResponseEntity<Void> trustDevice(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long userDeviceId
    ) {
        validateAuthentication(currentUser);
        userDeviceService.updateTrusted(currentUser.getId(), userDeviceId, true);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/devices/{userDeviceId}/untrust")
    public ResponseEntity<Void> untrustDevice(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long userDeviceId
    ) {
        validateAuthentication(currentUser);
        userDeviceService.updateTrusted(currentUser.getId(), userDeviceId, false);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login-approvals/{approvalRequestId}/approve")
    public ResponseEntity<Void> approveLogin(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long approvalRequestId
    ) {
        validateAuthentication(currentUser);
        loginApprovalService.approve(currentUser.getId(), approvalRequestId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/login-approvals/{approvalRequestId}/reject")
    public ResponseEntity<Void> rejectLogin(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long approvalRequestId
    ) {
        validateAuthentication(currentUser);
        loginApprovalService.reject(currentUser.getId(), approvalRequestId);
        return ResponseEntity.noContent().build();
    }

    private Long extractCurrentSessionId(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }

        return jwtService.extractSessionId(authorization.substring(7));
    }

    private void validateAuthentication(AuthenticatedUserDetails currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chua dang nhap");
        }
    }
}

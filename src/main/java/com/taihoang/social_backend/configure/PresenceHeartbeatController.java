package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.Service.PresenceNotificationService;
import com.taihoang.social_backend.Service.PresenceService;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class PresenceHeartbeatController {

    private final PresenceService presenceService;
    private final PresenceNotificationService presenceNotificationService;

    @MessageMapping("/presence.heartbeat")
    public void heartbeat(Principal principal, Message<?> message) {
        Long userId = extractUserId(principal);
        String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());

        boolean becameOnline = presenceService.touch(userId, sessionId);
        if (becameOnline) {
            presenceNotificationService.notifyContacts(presenceService.getPresence(userId));
        }
    }

    private Long extractUserId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AuthenticatedUserDetails userDetails) {
            return userDetails.getId();
        }
        throw new IllegalArgumentException("Khong xac dinh duoc user gui heartbeat");
    }
}

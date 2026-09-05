package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.Service.ChatObservabilityService;
import com.taihoang.social_backend.Service.PresenceNotificationService;
import com.taihoang.social_backend.Service.PresenceService;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class WebSocketPresenceListener {
    private final PresenceService presenceService;
    private final PresenceNotificationService presenceNotificationService;
    private final ChatObservabilityService chatObservabilityService;

    @EventListener
    public void onSessionConnected(SessionConnectedEvent event) {
        touchPresence(event.getUser(), event.getMessage().getHeaders().get("simpSessionId") == null
                ? null
                : event.getMessage().getHeaders().get("simpSessionId").toString());
    }

    @EventListener
    public void onSessionDisconnect(SessionDisconnectEvent event) {
        touchOffline(event.getUser(), event.getSessionId());
    }

    private void touchPresence(Principal principal, String sessionId) {
        Long userId = extractUserId(principal);
        if (userId != null && sessionId != null && !sessionId.isBlank()) {
            boolean becameOnline = presenceService.markOnline(userId, sessionId);
            chatObservabilityService.websocketConnected(userId, sessionId, becameOnline);
            if (becameOnline) {
                presenceNotificationService.notifyContacts(presenceService.getPresence(userId));
            }
        }
    }

    private void touchOffline(Principal principal, String sessionId) {
        Long userId = extractUserId(principal);
        if (userId != null && sessionId != null && !sessionId.isBlank()) {
            boolean becameOffline = presenceService.markOffline(userId, sessionId);
            chatObservabilityService.websocketDisconnected(userId, sessionId, becameOffline);
            if (becameOffline) {
                presenceNotificationService.notifyContacts(presenceService.getPresence(userId));
            }
        }
    }

    private Long extractUserId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AuthenticatedUserDetails userDetails) {
            return userDetails.getId();
        }
        return null;
    }
}

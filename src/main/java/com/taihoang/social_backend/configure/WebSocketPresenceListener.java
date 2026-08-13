package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.Service.PresenceService;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class WebSocketPresenceListener {
    private final PresenceService presenceService;

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
        if (userId != null) {
            presenceService.markOnline(userId, sessionId);
        }
    }

    private void touchOffline(Principal principal, String sessionId) {
        Long userId = extractUserId(principal);
        if (userId != null) {
            presenceService.markOffline(userId, sessionId);
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

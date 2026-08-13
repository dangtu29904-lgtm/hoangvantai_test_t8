package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.Service.PresenceService;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import com.taihoang.social_backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    private final JwtService jwtService;
    private final ObjectProvider<UserDetailsService> userDetailsServiceProvider;
    private final PresenceService presenceService;

    @Override
    public Message<?> preSend(
            Message<?> message,
            MessageChannel channel
    ) {
        System.out.println("PRE SEND RUNNING");
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(
                        message,
                        StompHeaderAccessor.class
                );
        if (accessor != null) {
            System.out.println("COMMAND = " + accessor.getCommand());
        }
        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            String authorization =
                    accessor.getFirstNativeHeader("Authorization");

            if (authorization == null ||
                    !authorization.startsWith("Bearer ")) {

                throw new IllegalArgumentException(
                        "Missing JWT token"
                );
            }

            String token = authorization.substring(7);

            String username = jwtService.extractUsername(token);

            UserDetailsService userDetailsService = userDetailsServiceProvider.getObject();
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            if (!jwtService.isTokenValid(token, userDetails)) {
                throw new IllegalArgumentException(
                        "Invalid JWT token"
                );
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );

            accessor.setUser(authentication);
            if (userDetails instanceof AuthenticatedUserDetails customUserDetails) {
                presenceService.markOnline(customUserDetails.getId(), accessor.getSessionId());
            }
            return message;
        }

        if (accessor.getUser() instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AuthenticatedUserDetails userDetails) {
            if (accessor.getCommand() == StompCommand.SEND
                    || accessor.getCommand() == StompCommand.SUBSCRIBE
                    || accessor.getCommand() == StompCommand.UNSUBSCRIBE
                    || accessor.getCommand() == null) {
                if (userDetails.getId() != null) {
                    presenceService.touch(userDetails.getId(), accessor.getSessionId());
                }
            }
        }

        return message;
    }
}

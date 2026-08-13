package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.Service.MessageService;
import com.taihoang.social_backend.dto.DeliveredRequest;
import com.taihoang.social_backend.dto.DeliveredResult;
import com.taihoang.social_backend.dto.MessageRequest;
import com.taihoang.social_backend.dto.SeenConversationRequest;
import com.taihoang.social_backend.dto.SeenConversationResult;
import com.taihoang.social_backend.dto.SeenRequest;
import com.taihoang.social_backend.dto.SeenResult;
import com.taihoang.social_backend.dto.SendMessageResult;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ChatController {
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Valid @Payload MessageRequest request, Principal principal) {
        Long senderId = extractUserId(principal);
        SendMessageResult result = messageService.handleSendMessage(senderId, request);

        messagingTemplate.convertAndSendToUser(
                result.senderDestination(),
                "/queue/messages.ack",
                result.message()
        );

        result.recipientDestinations().forEach(recipient ->
                messagingTemplate.convertAndSendToUser(
                        recipient,
                        "/queue/messages",
                        result.message()
                )
        );
    }

    @MessageMapping("/chat.delivered")
    public void delivered(@Valid @Payload DeliveredRequest request, Principal principal) {
        Long recipientId = extractUserId(principal);
        DeliveredResult result = messageService.handleDelivered(recipientId, request);

        messagingTemplate.convertAndSendToUser(
                result.senderDestination(),
                "/queue/messages.delivered",
                result.response()
        );
    }

    @MessageMapping("/chat.seen")
    public void seen(@Valid @Payload SeenRequest request, Principal principal) {
        Long recipientId = extractUserId(principal);
        SeenResult result = messageService.handleSeen(recipientId, request);

        messagingTemplate.convertAndSendToUser(
                result.senderDestination(),
                "/queue/messages.seen",
                result.response()
        );
    }

    @MessageMapping("/chat.seenConversation")
    public void seenConversation(@Valid @Payload SeenConversationRequest request, Principal principal) {
        Long recipientId = extractUserId(principal);
        SeenConversationResult result = messageService.handleSeenConversation(recipientId, request);

        if (result.senderDestination() != null) {
            messagingTemplate.convertAndSendToUser(
                    result.senderDestination(),
                    "/queue/messages.seen",
                    result.response()
            );
        }
    }

    private Long extractUserId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AuthenticatedUserDetails userDetails) {
            return userDetails.getId();
        }
        throw new IllegalArgumentException("Khong xac dinh duoc user gui tin nhan");
    }
}

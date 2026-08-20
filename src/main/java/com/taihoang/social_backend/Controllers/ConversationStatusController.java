package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.MessageService;
import com.taihoang.social_backend.dto.SeenConversationRequest;
import com.taihoang.social_backend.dto.SeenConversationResult;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/user/conversations")
@RequiredArgsConstructor
public class ConversationStatusController {
    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/{conversationId}/seen")
    public SeenConversationResult markSeen(
            @PathVariable Long conversationId,
            Principal principal
    ) {
        Long recipientId = extractUserId(principal);
        SeenConversationResult result = messageService.handleSeenConversation(
                recipientId,
                new SeenConversationRequest(conversationId)
        );

        if (result.senderDestination() != null) {
            messagingTemplate.convertAndSendToUser(
                    result.senderDestination(),
                    "/queue/messages.seen",
                    result.response()
            );
        }

        return result;
    }

    private Long extractUserId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof AuthenticatedUserDetails userDetails) {
            return userDetails.getId();
        }
        throw new IllegalArgumentException("Khong xac dinh duoc user dang nhap");
    }
}

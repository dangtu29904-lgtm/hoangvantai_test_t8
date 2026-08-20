package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.ChatSyncService;
import com.taihoang.social_backend.dto.ChatSyncResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/chat")
@RequiredArgsConstructor
public class ChatSyncController {
    private final ChatSyncService chatSyncService;

    @GetMapping("/sync")
    public ChatSyncResponse syncMessages(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @RequestParam(required = false) Long afterMessageId,
            @RequestParam(defaultValue = "100") int limit
    ) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chua dang nhap");
        }
        try {
            return chatSyncService.syncUndeliveredMessages(
                    currentUser.getId(),
                    afterMessageId,
                    limit
            );
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
}

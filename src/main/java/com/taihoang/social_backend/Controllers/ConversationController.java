package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.ConversationCommandService;
import com.taihoang.social_backend.Service.ConversationDetailService;
import com.taihoang.social_backend.Service.ConversationQueryService;
import com.taihoang.social_backend.Service.MessageQueryService;
import com.taihoang.social_backend.dto.*;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/conversations")
@RequiredArgsConstructor
public class ConversationController {
    private final ConversationQueryService conversationQueryService;
    private final MessageQueryService messageQueryService;
    private final ConversationCommandService conversationCommandService ;
    private final ConversationDetailService conversationDetailService ;
    @GetMapping
    public ConversationListResponse getConversations(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit
    ) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chua dang nhap");
        }
        try {
            return conversationQueryService.getConversations(currentUser.getId(), cursor, limit);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exception.getMessage(), exception);
        }
    }
    @GetMapping("/{conversationId}/messages")
    public MessageHistoryResponse getMessages(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long conversationId,
            @RequestParam(required = false) Long beforeSequence,
            @RequestParam(defaultValue = "30") int limit
    ) {
        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {
            return messageQueryService.getMessages(
                    currentUser.getId(),
                    conversationId,
                    beforeSequence,
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
    @PostMapping("/direct")
    public ResponseEntity<DirectConversationResponse> createDirectConversation(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @Valid @RequestBody DirectConversationRequest request
    ) {
        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {
            DirectConversationResponse response =
                    conversationCommandService.createDirectConversation(
                            currentUser.getId(),
                            request.recipientId()
                    );

            if (response.created()) {
                return ResponseEntity
                        .status(HttpStatus.CREATED)
                        .body(response);
            }

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @PostMapping("/group")
    public ResponseEntity<GroupConversationResponse> createGroupConversation(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @Valid @RequestBody GroupConversationRequest request
    ) {
        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {
            GroupConversationResponse response =
                    conversationCommandService.createGroupConversation(
                            currentUser.getId(),
                            request.name(),
                            request.memberIds()
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/{conversationId}")
    public ConversationDetailResponse getConversationDetail(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long conversationId
    ) {
        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {
            return conversationDetailService.getConversationDetail(
                    currentUser.getId(),
                    conversationId
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

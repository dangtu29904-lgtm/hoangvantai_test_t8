package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.ModerationService;
import com.taihoang.social_backend.dto.SuspendUserRequest;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
public class AdminModerationController {

    private final ModerationService moderationService;

    /**
     * DELETE /admin/posts/{postId}
     * Admin soft-delete bài viết vi phạm.
     */
    @DeleteMapping("/admin/posts/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePost(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long postId
    ) {
        requireAdmin(currentAdmin);
        moderationService.removePost(postId, currentAdmin.getId());
    }

    /**
     * DELETE /admin/comments/{commentId}
     * Admin soft-delete bình luận vi phạm.
     */
    @DeleteMapping("/admin/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeComment(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long commentId
    ) {
        requireAdmin(currentAdmin);
        moderationService.removeComment(commentId, currentAdmin.getId());
    }

    /**
     * PATCH /admin/users/{userId}/suspend
     * Admin suspend user.
     */
    @PatchMapping("/admin/users/{userId}/suspend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void suspendUser(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long userId,
            @Valid @RequestBody(required = false) SuspendUserRequest request
    ) {
        requireAdmin(currentAdmin);
        String reason = request != null ? request.reason() : null;
        moderationService.suspendUser(userId, currentAdmin.getId(), reason);
    }

    /**
     * PATCH /admin/users/{userId}/unsuspend
     * Admin khôi phục user.
     */
    @PatchMapping("/admin/users/{userId}/unsuspend")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsuspendUser(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long userId
    ) {
        requireAdmin(currentAdmin);
        moderationService.unsuspendUser(userId, currentAdmin.getId());
    }

    private void requireAdmin(AuthenticatedUserDetails currentAdmin) {
        if (currentAdmin == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chua dang nhap");
        }
    }
}

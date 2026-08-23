package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.StoryReactionService;
import com.taihoang.social_backend.Service.StoryReplyService;
import com.taihoang.social_backend.Service.StoryService;
import com.taihoang.social_backend.dto.*;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/user/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;
    private final StoryReactionService storyReactionService;
    private final StoryReplyService storyReplyService;

    // ==================== STORY CRUD ====================

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StoryResponse createStory(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @Valid @RequestBody CreateStoryRequest request
    ) {
        requireAuth(currentUser);
        return storyService.createStory(currentUser.getId(), request);
    }

    @GetMapping("/feed")
    public List<StoryFeedUserResponse> getStoryFeed(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser
    ) {
        requireAuth(currentUser);
        return storyService.getStoryFeed(currentUser.getId());
    }

    @GetMapping("/me")
    public List<StoryResponse> getMyStories(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser
    ) {
        requireAuth(currentUser);
        return storyService.getMyStories(currentUser.getId());
    }

    @GetMapping("/{storyId}")
    public StoryResponse getStory(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long storyId
    ) {
        requireAuth(currentUser);
        return storyService.getStory(currentUser.getId(), storyId);
    }

    @DeleteMapping("/{storyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStory(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long storyId
    ) {
        requireAuth(currentUser);
        storyService.deleteStory(currentUser.getId(), storyId);
    }

    // ==================== VIEW ====================

    @PostMapping("/{storyId}/view")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void viewStory(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long storyId
    ) {
        requireAuth(currentUser);
        storyService.viewStory(currentUser.getId(), storyId);
    }

    @GetMapping("/{storyId}/viewers")
    public StoryViewerListResponse getStoryViewers(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long storyId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int limit
    ) {
        requireAuth(currentUser);
        return storyService.getStoryViewers(currentUser.getId(), storyId, page, limit);
    }

    // ==================== REACTION ====================

    @PostMapping("/{storyId}/reaction")
    public StoryReactionResponse reactToStory(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long storyId,
            @Valid @RequestBody StoryReactionRequest request
    ) {
        requireAuth(currentUser);
        return storyReactionService.reactToStory(currentUser.getId(), storyId, request);
    }

    @DeleteMapping("/{storyId}/reaction")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeReaction(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long storyId
    ) {
        requireAuth(currentUser);
        storyReactionService.removeReaction(currentUser.getId(), storyId);
    }

    // ==================== REPLY ====================

    @PostMapping("/{storyId}/reply")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse replyToStory(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long storyId,
            @Valid @RequestBody StoryReplyRequest request
    ) {
        requireAuth(currentUser);
        return storyReplyService.replyToStory(currentUser.getId(), storyId, request);
    }

    // ==================== HELPER ====================

    private void requireAuth(AuthenticatedUserDetails currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chua dang nhap");
        }
    }
}

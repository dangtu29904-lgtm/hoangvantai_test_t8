package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.PostReactionService;
import com.taihoang.social_backend.Service.PostService;
import com.taihoang.social_backend.dto.PostListResponse;
import com.taihoang.social_backend.dto.ReactionListResponse;
import com.taihoang.social_backend.dto.ReactionRequest;
import com.taihoang.social_backend.dto.ReactionResponse;
import com.taihoang.social_backend.exception.PostAccessDeniedException;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/feed")
@RequiredArgsConstructor
public class FeedController {

    private final PostService postService;
    private final PostReactionService postReactionService ;
    @GetMapping
    public PostListResponse getFeed(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "20")
            int limit
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postService.getFeed(
                    currentUser.getId(),
                    page,
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
    @PostMapping("/{postId}/reactions")
    public ReactionResponse reactToPost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long postId,

            @Valid
            @RequestBody ReactionRequest request
    ) {

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postReactionService.reactToPost(
                    currentUser.getId(),
                    postId,
                    request
            );

        } catch (PostAccessDeniedException exception) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    exception.getMessage(),
                    exception
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @DeleteMapping("/{postId}/reactions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeReaction(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long postId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            postReactionService.removeReaction(
                    currentUser.getId(),
                    postId
            );

        } catch (PostAccessDeniedException exception) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    exception.getMessage(),
                    exception
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/{postId}/reactions")
    public ReactionListResponse getPostReactions(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long postId,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "20")
            int limit
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postReactionService.getPostReactions(
                    currentUser.getId(),
                    postId,
                    page,
                    limit
            );

        } catch (PostAccessDeniedException exception) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    exception.getMessage(),
                    exception
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    exception.getMessage(),
                    exception
            );
        }
    }
}
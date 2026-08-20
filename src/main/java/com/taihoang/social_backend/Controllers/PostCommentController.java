package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.PostCommentService;
import com.taihoang.social_backend.dto.CommentListResponse;
import com.taihoang.social_backend.dto.CommentResponse;
import com.taihoang.social_backend.dto.CreateCommentRequest;
import com.taihoang.social_backend.dto.UpdateCommentRequest;
import com.taihoang.social_backend.exception.PostAccessDeniedException;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/posts")
@RequiredArgsConstructor
public class PostCommentController {

    private final PostCommentService
            postCommentService;

    @PostMapping("/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse createComment(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long postId,

            @Valid
            @RequestBody
            CreateCommentRequest request
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postCommentService
                    .createComment(
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
    @GetMapping("/{postId}/comments")
    public CommentListResponse getComments(

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

            return postCommentService.getComments(
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
    @PutMapping("/comments/{commentId}")
    public CommentResponse updateComment(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long commentId,

            @Valid
            @RequestBody
            UpdateCommentRequest request
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postCommentService.updateComment(
                    currentUser.getId(),
                    commentId,
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
    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long commentId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            postCommentService.deleteComment(
                    currentUser.getId(),
                    commentId
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
    @PostMapping("/comments/{commentId}/replies")
    @ResponseStatus(HttpStatus.CREATED)
    public CommentResponse createReply(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long commentId,

            @Valid
            @RequestBody
            CreateCommentRequest request
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postCommentService.createReply(
                    currentUser.getId(),
                    commentId,
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
}

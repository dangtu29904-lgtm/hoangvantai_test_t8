package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.PostService;
import com.taihoang.social_backend.dto.CreatePostRequest;
import com.taihoang.social_backend.dto.PostListResponse;
import com.taihoang.social_backend.dto.PostResponse;
import com.taihoang.social_backend.dto.UpdatePostRequest;
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
public class PostController {

    private final PostService postService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PostResponse createPost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @Valid
            @RequestBody
            CreatePostRequest request
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postService.createPost(
                    currentUser.getId(),
                    request
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/{postId}")
    public PostResponse getPost(

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

            return postService.getPost(
                    currentUser.getId(),
                    postId
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @PutMapping("/{postId}")
    public PostResponse updatePost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long postId,

            @Valid
            @RequestBody
            UpdatePostRequest request
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return postService.updatePost(
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
    @DeleteMapping("/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePost(

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

            postService.deletePost(
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
    @GetMapping("/user/{userId}")
    public PostListResponse getUserPosts(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long userId,

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

            return postService.getUserPosts(
                    currentUser.getId(),
                    userId,
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
}
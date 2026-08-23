package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.HiddenPostService;
import com.taihoang.social_backend.Service.PostService;
import com.taihoang.social_backend.Service.SavedPostService;
import com.taihoang.social_backend.dto.*;
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
    private final SavedPostService savedPostService ;
    private final HiddenPostService hiddenPostService;
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
    public PostDetailResponse getPost(

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
    @PostMapping("/{postId}/save")
    public SavedPostResponse savePost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long postId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }


        try {

            return savedPostService.savePost(
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
    @DeleteMapping("/{postId}/save")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsavePost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long postId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }


        savedPostService.unsavePost(
                currentUser.getId(),
                postId
        );
    }
    @GetMapping("/saved")
    public SavedPostListResponse getSavedPosts(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @RequestParam(
                    defaultValue = "0"
            )
            int page,

            @RequestParam(
                    defaultValue = "20"
            )
            int limit
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }


        try {

            return savedPostService
                    .getSavedPosts(
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
    @PostMapping("/{postId}/share")
    @ResponseStatus(HttpStatus.CREATED)
    public SharePostResponse sharePost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long postId,

            @Valid
            @RequestBody
            SharePostRequest request
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }


        try {

            return postService.sharePost(

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
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }

    @PostMapping("/{postId}/hide")
    public HidePostResponse hidePost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long postId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return hiddenPostService.hidePost(
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

    @DeleteMapping("/{postId}/hide")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unhidePost(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long postId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        hiddenPostService.unhidePost(
                currentUser.getId(),
                postId
        );
    }
}
package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Post;
import com.taihoang.social_backend.Entity.SavedPost;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.PostRepository;
import com.taihoang.social_backend.Repository.SavedPostRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.PostAccessService;
import com.taihoang.social_backend.Service.PostResponseMapper;
import com.taihoang.social_backend.Service.SavedPostService;
import com.taihoang.social_backend.dto.SavedPostItemResponse;
import com.taihoang.social_backend.dto.SavedPostListResponse;
import com.taihoang.social_backend.dto.SavedPostResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SavedPostServiceImpl
        implements SavedPostService {

    private final SavedPostRepository
            savedPostRepository;

    private final PostRepository
            postRepository;

    private final UserRepository
            userRepository;

    private final PostAccessService
            postAccessService;
    private final PostResponseMapper
            postResponseMapper;


    @Override
    @Transactional
    public SavedPostResponse savePost(
            Long currentUserId,
            Long postId
    ) {

        // ===============================
        // POST
        // ===============================

        Post post =
                postRepository
                        .findActiveById(postId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay bai viet"
                                )
                        );


        // ===============================
        // QUYEN XEM POST
        // ===============================

        postAccessService.validateCanView(
                currentUserId,
                post
        );


        // ===============================
        // IDEMPOTENT
        // ===============================

        return savedPostRepository
                .findByUser_IdAndPost_Id(
                        currentUserId,
                        postId
                )

                .map(savedPost ->
                        new SavedPostResponse(
                                postId,
                                true,
                                savedPost.getSavedAt()
                        )
                )

                .orElseGet(() ->
                        createSavedPost(
                                currentUserId,
                                post
                        )
                );
    }


    private SavedPostResponse createSavedPost(
            Long currentUserId,
            Post post
    ) {

        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );


        SavedPost savedPost =
                new SavedPost();

        savedPost.setUser(
                currentUser
        );

        savedPost.setPost(
                post
        );


        SavedPost saved =
                savedPostRepository
                        .save(savedPost);


        return new SavedPostResponse(

                post.getId(),

                true,

                saved.getSavedAt()
        );
    }
    @Override
    @Transactional
    public void unsavePost(
            Long currentUserId,
            Long postId
    ) {

        savedPostRepository
                .deleteByUser_IdAndPost_Id(
                        currentUserId,
                        postId
                );
    }
    @Override
    @Transactional(readOnly = true)
    public SavedPostListResponse getSavedPosts(

            Long currentUserId,

            int page,

            int limit
    ) {

        // ===============================
        // VALIDATE PAGINATION
        // ===============================

        if (page < 0) {

            throw new IllegalArgumentException(
                    "Page khong hop le"
            );
        }


        if (limit <= 0
                || limit > 100) {

            throw new IllegalArgumentException(
                    "Limit phai nam trong khoang 1 den 100"
            );
        }


        // ===============================
        // CURRENT USER
        // ===============================

        if (!userRepository.existsById(
                currentUserId
        )) {

            throw new IllegalArgumentException(
                    "Khong tim thay user"
            );
        }


        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );


        // ===============================
        // SAVED POSTS
        // ===============================

        Page<SavedPost> savedPostPage =
                savedPostRepository
                        .findVisibleSavedPosts(
                                currentUserId,
                                pageable
                        );


        List<SavedPostItemResponse> items =
                savedPostPage
                        .getContent()
                        .stream()

                        .map(savedPost ->
                                new SavedPostItemResponse(

                                        postResponseMapper
                                                .toResponse(
                                                        currentUserId,
                                                        savedPost.getPost()
                                                ),

                                        savedPost.getSavedAt()
                                )
                        )

                        .toList();


        return new SavedPostListResponse(

                items,

                page,

                limit,

                savedPostPage.getTotalElements(),

                savedPostPage.getTotalPages()
        );
    }
}
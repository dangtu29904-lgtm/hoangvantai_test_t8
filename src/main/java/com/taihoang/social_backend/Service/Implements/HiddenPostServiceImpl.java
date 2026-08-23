package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.HiddenPost;
import com.taihoang.social_backend.Entity.Post;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.HiddenPostRepository;
import com.taihoang.social_backend.Repository.PostRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.HiddenPostService;
import com.taihoang.social_backend.Service.PostAccessService;
import com.taihoang.social_backend.dto.HidePostResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HiddenPostServiceImpl
        implements HiddenPostService {

    private final HiddenPostRepository hiddenPostRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostAccessService postAccessService;

    @Override
    @Transactional
    public HidePostResponse hidePost(
            Long currentUserId,
            Long postId
    ) {

        // ==========================================
        // 1. FIND ACTIVE POST
        // ==========================================

        Post post = postRepository
                .findActiveById(postId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Khong tim thay bai viet"
                        )
                );

        // ==========================================
        // 2. CHECK VIEW PERMISSION
        // ==========================================

        postAccessService.validateCanView(
                currentUserId,
                post
        );

        // ==========================================
        // 3. IDEMPOTENT CHECK
        // ==========================================

        return hiddenPostRepository
                .findByUser_IdAndPost_Id(
                        currentUserId,
                        postId
                )
                .map(hiddenPost ->
                        new HidePostResponse(
                                postId,
                                true,
                                hiddenPost.getHiddenAt()
                        )
                )
                .orElseGet(() ->
                        createHiddenPost(
                                currentUserId,
                                post
                        )
                );
    }

    private HidePostResponse createHiddenPost(
            Long currentUserId,
            Post post
    ) {

        User currentUser = userRepository
                .findById(currentUserId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );

        HiddenPost hiddenPost = new HiddenPost();
        hiddenPost.setUser(currentUser);
        hiddenPost.setPost(post);

        HiddenPost saved = hiddenPostRepository.save(hiddenPost);

        return new HidePostResponse(
                post.getId(),
                true,
                saved.getHiddenAt()
        );
    }

    @Override
    @Transactional
    public void unhidePost(
            Long currentUserId,
            Long postId
    ) {

        hiddenPostRepository
                .deleteByUser_IdAndPost_Id(
                        currentUserId,
                        postId
                );
    }
}

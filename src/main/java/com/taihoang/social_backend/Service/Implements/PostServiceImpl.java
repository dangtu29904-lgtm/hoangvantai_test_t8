package com.taihoang.social_backend.Service.Implements;
import com.taihoang.social_backend.Entity.Friendship;
import com.taihoang.social_backend.Entity.Post;
import com.taihoang.social_backend.Entity.PostPrivacy;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.FriendshipRepository;
import com.taihoang.social_backend.Repository.PostRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.PostService;
import com.taihoang.social_backend.dto.CreatePostRequest;
import com.taihoang.social_backend.dto.PostListResponse;
import com.taihoang.social_backend.dto.PostResponse;
import com.taihoang.social_backend.dto.UpdatePostRequest;
import com.taihoang.social_backend.exception.PostAccessDeniedException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PostServiceImpl
        implements PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository ;

    @Override
    @Transactional
    public PostResponse createPost(
            Long currentUserId,
            CreatePostRequest request
    ) {

        User author = userRepository
                .findById(currentUserId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );

        String content = request.content().trim();

        if (content.isBlank()) {
            throw new IllegalArgumentException(
                    "Noi dung bai viet khong duoc de trong"
            );
        }

        Post post = new Post();

        post.setAuthor(author);
        post.setContent(content);

        post.setPrivacy(
                request.privacy() == null
                        ? PostPrivacy.PUBLIC
                        : request.privacy()
        );

        Post savedPost =
                postRepository.save(post);

        return toResponse(savedPost);
    }

    private PostResponse toResponse(Post post) {

        User author = post.getAuthor();

        return new PostResponse(
                post.getId(),
                author.getId(),
                author.getUserName(),
                author.getAvatarUrl(),
                post.getContent(),
                post.getPrivacy(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
    @Override
    @Transactional
    public PostResponse getPost(
            Long currentUserId,
            Long postId
    ) {

        Post post = postRepository
                .findActiveById(postId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay bai viet"
                        )
                );

        checkViewPermission(
                currentUserId,
                post
        );

        return toResponse(post);
    }
    private void checkViewPermission(
            Long currentUserId,
            Post post
    ) {

        Long authorId =
                post.getAuthor().getId();

        // Chủ bài luôn được xem bài của mình
        if (authorId.equals(currentUserId)) {
            return;
        }

        switch (post.getPrivacy()) {

            case PUBLIC -> {
                return;
            }

            case ONLY_ME -> throw
                    new IllegalArgumentException(
                            "Ban khong co quyen xem bai viet nay"
                    );

            case FRIENDS -> {

                String pairKey =
                        buildPairKey(
                                currentUserId,
                                authorId
                        );

                boolean isFriend =
                        friendshipRepository
                                .findByPairKey(pairKey)
                                .map(friendship ->
                                        friendship.getStatus()
                                                == Friendship
                                                .FriendshipStatus
                                                .ACCEPTED
                                )
                                .orElse(false);

                if (!isFriend) {

                    throw new IllegalArgumentException(
                            "Ban khong co quyen xem bai viet nay"
                    );
                }
            }
        }
    }
    private String buildPairKey(
            Long firstUserId,
            Long secondUserId
    ) {

        Long min = Math.min(
                firstUserId,
                secondUserId
        );

        Long max = Math.max(
                firstUserId,
                secondUserId
        );

        return min + ":" + max;
    }
    @Override
    @Transactional
    public PostResponse updatePost(
            Long currentUserId,
            Long postId,
            UpdatePostRequest request
    ) {

        Post post = postRepository
                .findActiveById(postId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay bai viet"
                        )
                );

        if (!post.getAuthor()
                .getId()
                .equals(currentUserId)) {

            throw new PostAccessDeniedException(
                    "Ban khong co quyen sua bai viet nay"
            );
        }

        String content =
                request.content().trim();

        if (content.isBlank()) {

            throw new IllegalArgumentException(
                    "Noi dung bai viet khong duoc de trong"
            );
        }

        post.setContent(content);
        post.setPrivacy(request.privacy());

        Post savedPost =
                postRepository.save(post);

        return toResponse(savedPost);
    }
    @Override
    @Transactional
    public void deletePost(
            Long currentUserId,
            Long postId
    ) {

        Post post = postRepository
                .findById(postId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay bai viet"
                        )
                );

        if (!post.getAuthor()
                .getId()
                .equals(currentUserId)) {

            throw new PostAccessDeniedException(
                    "Ban khong co quyen xoa bai viet nay"
            );
        }
        post.softDelete(post.getAuthor());

        postRepository.save(post);
    }
    @Override
    @Transactional
    public PostListResponse getUserPosts(
            Long currentUserId,
            Long userId,
            int page,
            int limit
    ) {

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page khong hop le"
            );
        }

        if (limit <= 0 || limit > 100) {
            throw new IllegalArgumentException(
                    "Limit phai nam trong khoang 1 den 100"
            );
        }

        userRepository
                .findById(userId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );

        boolean isOwner =
                currentUserId.equals(userId);

        boolean isFriend = false;

        if (!isOwner) {

            String pairKey =
                    buildPairKey(
                            currentUserId,
                            userId
                    );

            isFriend = friendshipRepository
                    .findByPairKey(pairKey)
                    .map(friendship ->
                            friendship.getStatus()
                                    == Friendship
                                    .FriendshipStatus
                                    .ACCEPTED
                    )
                    .orElse(false);
        }

        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );

        Page<Post> postPage =
                postRepository
                        .findVisiblePostsByUser(
                                userId,
                                isOwner,
                                isFriend,
                                pageable
                        );

        List<PostResponse> items =
                postPage.getContent()
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return new PostListResponse(
                items,
                page,
                limit,
                postPage.getTotalElements(),
                postPage.getTotalPages()
        );
    }
    @Override
    @Transactional
    public PostListResponse getFeed(
            Long currentUserId,
            int page,
            int limit
    ) {

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page khong hop le"
            );
        }

        if (limit <= 0 || limit > 100) {
            throw new IllegalArgumentException(
                    "Limit phai nam trong khoang 1 den 100"
            );
        }

        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );

        Page<Post> postPage =
                postRepository.findFeed(
                        currentUserId,
                        pageable
                );

        List<PostResponse> items =
                postPage.getContent()
                        .stream()
                        .map(this::toResponse)
                        .toList();

        return new PostListResponse(
                items,
                page,
                limit,
                postPage.getTotalElements(),
                postPage.getTotalPages()
        );
    }
}

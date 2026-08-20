package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.FriendshipRepository;
import com.taihoang.social_backend.Repository.PostReactionRepository;
import com.taihoang.social_backend.Repository.PostRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.PostReactionService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostReactionServiceImpl implements PostReactionService {
    private final PostReactionRepository postReactionRepository ;
    private final PostRepository postRepository ;
    private final UserRepository userRepository ;
    private final FriendshipRepository friendshipRepository ;
    @Override
    @Transactional
    public ReactionResponse reactToPost(
            Long currentUserId,
            Long postId,
            ReactionRequest request
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

        User user = userRepository
                .findById(currentUserId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );

        PostReaction reaction =
                postReactionRepository
                        .findByPost_IdAndUser_Id(
                                postId,
                                currentUserId
                        )
                        .orElseGet(() -> {

                            PostReaction newReaction =
                                    new PostReaction();

                            newReaction.setPost(post);
                            newReaction.setUser(user);

                            return newReaction;
                        });

        reaction.setType(request.type());

        PostReaction saved =
                postReactionRepository.save(reaction);

        return toReactionResponse(saved);
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
    private ReactionResponse toReactionResponse(
            PostReaction reaction
    ) {

        User user = reaction.getUser();

        return new ReactionResponse(
                reaction.getId(),
                reaction.getPost().getId(),
                user.getId(),
                user.getUserName(),
                user.getAvatarUrl(),
                reaction.getType(),
                reaction.getCreatedAt(),
                reaction.getUpdatedAt()
        );
    }
    @Override
    @Transactional
    public void removeReaction(
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

        postReactionRepository
                .findByPost_IdAndUser_Id(
                        postId,
                        currentUserId
                )
                .ifPresent(
                        postReactionRepository::delete
                );
    }
    @Override
    @Transactional
    public ReactionListResponse getPostReactions(
            Long currentUserId,
            Long postId,
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

        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );

        Page<PostReaction> reactionPage =
                postReactionRepository
                        .findByPost_Id(
                                postId,
                                pageable
                        );

        List<ReactionItemResponse> items =
                reactionPage
                        .getContent()
                        .stream()
                        .map(this::toReactionItemResponse)
                        .toList();

        ReactionType myReaction =
                postReactionRepository
                        .findByPost_IdAndUser_Id(
                                postId,
                                currentUserId
                        )
                        .map(PostReaction::getType)
                        .orElse(null);

        long totalReactions =
                reactionPage.getTotalElements();

        Map<ReactionType, Long> reactionCounts =
                postReactionRepository
                        .countReactionTypes(postId)
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        ReactionCountProjection::getType,
                                        ReactionCountProjection::getCount
                                )
                        );

        return new ReactionListResponse(
                items,
                myReaction,
                totalReactions,
                reactionCounts,
                page,
                limit,
                reactionPage.getTotalPages()
        );
    }
    private ReactionItemResponse toReactionItemResponse(
            PostReaction reaction
    ) {

        User user = reaction.getUser();

        return new ReactionItemResponse(
                user.getId(),
                user.getUserName(),
                user.getAvatarUrl(),
                reaction.getType(),
                reaction.getCreatedAt()
        );
    }
}

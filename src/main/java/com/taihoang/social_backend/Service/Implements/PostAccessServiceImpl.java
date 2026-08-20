package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Friendship;
import com.taihoang.social_backend.Entity.Post;
import com.taihoang.social_backend.Repository.FriendshipRepository;
import com.taihoang.social_backend.Service.PostAccessService;
import com.taihoang.social_backend.exception.PostAccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PostAccessServiceImpl
        implements PostAccessService {

    private final FriendshipRepository friendshipRepository;

    @Override
    public void validateCanView(
            Long currentUserId,
            Post post
    ) {

        // Post đã bị xóa mềm
        if (post.isDeleted()) {

            throw new IllegalArgumentException(
                    "Bai viet khong con ton tai"
            );
        }

        Long authorId =
                post.getAuthor().getId();

        // Chính chủ luôn xem được bài của mình
        if (authorId.equals(currentUserId)) {
            return;
        }

        switch (post.getPrivacy()) {

            case PUBLIC -> {
                return;
            }

            case ONLY_ME -> throw
                    new PostAccessDeniedException(
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

                    throw new PostAccessDeniedException(
                            "Ban khong co quyen xem bai viet nay"
                    );
                }
            }
        }
    }

    private String buildPairKey(
            Long userId1,
            Long userId2
    ) {

        long min =
                Math.min(userId1, userId2);

        long max =
                Math.max(userId1, userId2);

        return min + ":" + max;
    }
}
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

        if (post.isDeleted()) {

            throw new IllegalArgumentException(
                    "Bai viet khong con ton tai"
            );
        }


        if (!canView(
                currentUserId,
                post
        )) {

            throw new PostAccessDeniedException(
                    "Ban khong co quyen xem bai viet nay"
            );
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
    @Override
    public boolean canView(
            Long currentUserId,
            Post post
    ) {

        if (post == null
                || post.isDeleted()) {

            return false;
        }


        Long authorId =
                post.getAuthor().getId();


        // Chính chủ
        if (authorId.equals(
                currentUserId
        )) {

            return true;
        }


        return switch (
                post.getPrivacy()
                ) {

            case PUBLIC ->
                    true;


            case ONLY_ME ->
                    false;


            case FRIENDS -> {

                String pairKey =
                        buildPairKey(
                                currentUserId,
                                authorId
                        );


                boolean isFriend =
                        friendshipRepository
                                .findByPairKey(
                                        pairKey
                                )
                                .map(friendship ->
                                        friendship.getStatus()
                                                == Friendship
                                                .FriendshipStatus
                                                .ACCEPTED
                                )
                                .orElse(false);


                yield isFriend;
            }
        };
    }
}
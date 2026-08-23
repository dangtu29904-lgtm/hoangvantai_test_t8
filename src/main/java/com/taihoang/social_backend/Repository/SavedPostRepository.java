package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.SavedPost;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SavedPostRepository
        extends JpaRepository<SavedPost, Long> {

    Optional<SavedPost>
    findByUser_IdAndPost_Id(
            Long userId,
            Long postId
    );

    boolean existsByUser_IdAndPost_Id(
            Long userId,
            Long postId
    );
    long deleteByUser_IdAndPost_Id(
            Long userId,
            Long postId
    );
    @EntityGraph(
            attributePaths = {
                    "post",
                    "post.author"
            }
    )
    @Query("""
    select sp
    from SavedPost sp
    join sp.post p

    where sp.user.id = :currentUserId

      and p.deleted = false

      and (
            p.author.id = :currentUserId

            or p.privacy =
                com.taihoang.social_backend.Entity.PostPrivacy.PUBLIC

            or (
                p.privacy =
                    com.taihoang.social_backend.Entity.PostPrivacy.FRIENDS

                and exists (
                    select f.id
                    from Friendship f

                    where f.status =
                        com.taihoang.social_backend.Entity.Friendship.FriendshipStatus.ACCEPTED

                      and (
                            (
                                f.requester.id = :currentUserId
                                and f.receiver.id = p.author.id
                            )

                            or

                            (
                                f.receiver.id = :currentUserId
                                and f.requester.id = p.author.id
                            )
                      )
                )
            )
      )

    order by sp.savedAt desc, sp.id desc
""")
    Page<SavedPost> findVisibleSavedPosts(
            @Param("currentUserId")
            Long currentUserId,

            Pageable pageable
    );
}
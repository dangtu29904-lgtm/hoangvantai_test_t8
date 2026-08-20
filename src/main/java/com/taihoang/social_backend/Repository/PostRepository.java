package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostRepository
        extends JpaRepository<Post, Long> {
    @Query("""
    select p
    from Post p
    where p.id = :postId
      and p.deleted = false
""")
    Optional<Post> findActiveById(
            @Param("postId") Long postId
    );
    @Query("""
    select p
    from Post p
    where p.author.id = :authorId
      and p.deleted = false
      and (
            :isOwner = true
            or p.privacy = com.taihoang.social_backend.Entity.PostPrivacy.PUBLIC
            or (
                :isFriend = true
                and p.privacy = com.taihoang.social_backend.Entity.PostPrivacy.FRIENDS
            )
      )
    order by p.createdAt desc
""")
    Page<Post> findVisiblePostsByUser(

            @Param("authorId")
            Long authorId,

            @Param("isOwner")
            boolean isOwner,

            @Param("isFriend")
            boolean isFriend,

            Pageable pageable
    );
    @EntityGraph(attributePaths = "author")
    @Query("""
    select p
    from Post p
    where p.deleted = false
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
    order by p.createdAt desc, p.id desc
""")
    Page<Post> findFeed(
            @Param("currentUserId")
            Long currentUserId,

            Pageable pageable
    );
}
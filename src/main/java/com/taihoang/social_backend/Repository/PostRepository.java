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
      and not exists (
            select hp.id
            from HiddenPost hp
            where hp.user.id = :currentUserId
              and hp.post.id = p.id
      )
    order by p.createdAt desc, p.id desc
""")
    Page<Post> findFeed(
            @Param("currentUserId")
            Long currentUserId,

            Pageable pageable
    );
    long countBySharedPost_IdAndDeletedFalse(
            Long postId
    );

    // Admin: find post regardless of deleted state
    // Admin: find post regardless of deleted state
    Optional<Post> findById(Long id);

    // ==========================================
    // ADMIN STATISTICS
    // ==========================================

    long countByDeleted(boolean deleted);

    @Query("SELECT COUNT(p) FROM Post p WHERE p.createdAt >= :start AND p.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query(value = "SELECT DATE(created_at) AS date, COUNT(*) AS count FROM posts WHERE created_at >= :start AND created_at < :end GROUP BY DATE(created_at) ORDER BY DATE(created_at)", nativeQuery = true)
    java.util.List<com.taihoang.social_backend.dto.statistics.DailyCountProjection> countDailyGrowth(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );

    @Query("""
    SELECT 
        p.id AS postId,
        p.author.id AS authorId,
        p.author.userName AS authorName,
        p.content AS content,
        p.createdAt AS createdAt,
        p.deleted AS deleted,
        (SELECT COUNT(pr) FROM PostReaction pr WHERE pr.post.id = p.id) AS reactionCount,
        (SELECT COUNT(pc) FROM PostComment pc WHERE pc.post.id = p.id AND pc.deleted = false) AS commentCount,
        (SELECT COUNT(ps) FROM Post ps WHERE ps.sharedPost.id = p.id AND ps.deleted = false) AS shareCount
    FROM Post p
    WHERE p.createdAt >= :start AND p.createdAt < :end AND p.deleted = false
    """)
    java.util.List<com.taihoang.social_backend.dto.statistics.TopPostProjection> findTopPostsInPeriod(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );

    @Query("SELECT p.author.id AS userId, COUNT(p) AS count FROM Post p WHERE p.createdAt >= :start AND p.createdAt < :end AND p.deleted = false GROUP BY p.author.id")
    java.util.List<com.taihoang.social_backend.dto.statistics.UserActivityCountProjection> countActiveUserPosts(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );
}
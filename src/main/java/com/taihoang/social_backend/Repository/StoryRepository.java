package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Story;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StoryRepository extends JpaRepository<Story, Long> {

    @EntityGraph(attributePaths = {"author", "mediaUpload", "musicTrack", "textOverlays"})
    @Query("""
        SELECT s FROM Story s
        WHERE s.id = :id
          AND s.deleted = false
          AND s.expiresAt > :now
    """)
    Optional<Story> findActiveById(@Param("id") Long id, @Param("now") LocalDateTime now);

    @EntityGraph(attributePaths = {"author", "mediaUpload", "musicTrack", "textOverlays"})
    @Query("""
        SELECT s FROM Story s
        WHERE s.author.id = :authorId
          AND s.deleted = false
          AND s.expiresAt > :now
        ORDER BY s.createdAt ASC
    """)
    List<Story> findActiveStoriesByAuthor(@Param("authorId") Long authorId, @Param("now") LocalDateTime now);
    
    @EntityGraph(attributePaths = {"author", "mediaUpload", "musicTrack", "textOverlays"})
    @Query("""
        SELECT s FROM Story s
        WHERE s.author.id = :authorId
          AND s.deleted = false
          AND s.expiresAt > :now
        ORDER BY s.createdAt DESC
    """)
    Page<Story> findActiveStoriesByAuthorDesc(@Param("authorId") Long authorId, @Param("now") LocalDateTime now, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "mediaUpload", "musicTrack", "textOverlays"})
    @Query("""
        SELECT s FROM Story s
        WHERE s.deleted = false
          AND s.expiresAt > :now
          AND (
               s.author.id = :currentUserId
               OR s.privacy = com.taihoang.social_backend.Entity.StoryPrivacy.PUBLIC
               OR (
                   s.privacy = com.taihoang.social_backend.Entity.StoryPrivacy.FRIENDS
                   AND EXISTS (
                       SELECT f.id FROM Friendship f
                       WHERE f.status = com.taihoang.social_backend.Entity.Friendship.FriendshipStatus.ACCEPTED
                         AND (
                             (f.requester.id = :currentUserId AND f.receiver.id = s.author.id)
                             OR
                             (f.receiver.id = :currentUserId AND f.requester.id = s.author.id)
                         )
                   )
               )
          )
        ORDER BY s.createdAt ASC
    """)
    List<Story> findActiveFeedStories(@Param("currentUserId") Long currentUserId, @Param("now") LocalDateTime now);

    // ==========================================
    // ADMIN STATISTICS
    // ==========================================

    long countByDeleted(boolean deleted);

    @Query("SELECT COUNT(s) FROM Story s WHERE s.deleted = false AND s.expiresAt > :now")
    long countActiveStories(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(s) FROM Story s WHERE s.deleted = false AND s.expiresAt <= :now")
    long countExpiredStories(@Param("now") LocalDateTime now);

    @Query("SELECT COUNT(s) FROM Story s WHERE s.createdAt >= :start AND s.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query(value = "SELECT DATE(created_at) AS date, COUNT(*) AS count FROM stories WHERE created_at >= :start AND created_at < :end GROUP BY DATE(created_at) ORDER BY DATE(created_at)", nativeQuery = true)
    java.util.List<com.taihoang.social_backend.dto.statistics.DailyCountProjection> countDailyGrowth(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );

    @Query("SELECT s.author.id AS userId, COUNT(s) AS count FROM Story s WHERE s.createdAt >= :start AND s.createdAt < :end AND s.deleted = false GROUP BY s.author.id")
    java.util.List<com.taihoang.social_backend.dto.statistics.UserActivityCountProjection> countActiveUserStories(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );
}

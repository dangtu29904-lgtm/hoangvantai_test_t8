package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostCommentRepository
        extends JpaRepository<PostComment, Long> {
    @EntityGraph(attributePaths = "author")
    Page<PostComment>
    findByPost_IdAndDeletedFalseOrderByCreatedAtAscIdAsc(
            Long postId,
            Pageable pageable
    );
    @Query("""
    select c
    from PostComment c
    join fetch c.author
    join fetch c.post
    where c.id = :commentId
      and c.deleted = false
""")
    Optional<PostComment> findActiveById(
            @Param("commentId")
            Long commentId
    );
    long countByPost_IdAndDeletedFalse(
            Long postId
    );

    // ==========================================
    // ADMIN STATISTICS
    // ==========================================

    @Query("SELECT COUNT(c) FROM PostComment c WHERE c.createdAt >= :start AND c.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query(value = "SELECT DATE(created_at) AS date, COUNT(*) AS count FROM post_comments WHERE created_at >= :start AND created_at < :end GROUP BY DATE(created_at) ORDER BY DATE(created_at)", nativeQuery = true)
    java.util.List<com.taihoang.social_backend.dto.statistics.DailyCountProjection> countDailyGrowth(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );

    @Query("SELECT c.author.id AS userId, COUNT(c) AS count FROM PostComment c WHERE c.createdAt >= :start AND c.createdAt < :end AND c.deleted = false GROUP BY c.author.id")
    java.util.List<com.taihoang.social_backend.dto.statistics.UserActivityCountProjection> countActiveUserComments(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );
}
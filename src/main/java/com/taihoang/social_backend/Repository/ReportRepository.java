package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Report;
import com.taihoang.social_backend.Entity.ReportReason;
import com.taihoang.social_backend.Entity.ReportStatus;
import com.taihoang.social_backend.Entity.ReportTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ReportRepository extends JpaRepository<Report, Long> {

    Optional<Report> findByReporter_IdAndTargetTypeAndTargetId(
            Long reporterId,
            ReportTargetType targetType,
            Long targetId
    );

    @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
    Page<Report> findByReporter_IdOrderByCreatedAtDescIdDesc(
            Long reporterId,
            Pageable pageable
    );

    Optional<Report> findByIdAndReporter_Id(
            Long id,
            Long reporterId
    );

    @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
    @Query("""
            SELECT r FROM Report r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:targetType IS NULL OR r.targetType = :targetType)
              AND (:reason IS NULL OR r.reason = :reason)
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    Page<Report> findByFilters(
            @Param("status") ReportStatus status,
            @Param("targetType") ReportTargetType targetType,
            @Param("reason") ReportReason reason,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"reporter", "reviewedBy"})
    Optional<Report> findById(Long id);

    // ==========================================
    // ADMIN STATISTICS
    // ==========================================

    long countByStatus(ReportStatus status);

    @Query("SELECT COUNT(r) FROM Report r WHERE r.createdAt >= :start AND r.createdAt < :end")
    long countByCreatedAtBetween(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query(value = "SELECT DATE(created_at) AS date, COUNT(*) AS count FROM reports WHERE created_at >= :start AND created_at < :end GROUP BY DATE(created_at) ORDER BY DATE(created_at)", nativeQuery = true)
    java.util.List<com.taihoang.social_backend.dto.statistics.DailyCountProjection> countDailyGrowth(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );

    @Query("SELECT CAST(r.status AS string) AS key, COUNT(r) AS count FROM Report r GROUP BY r.status")
    java.util.List<com.taihoang.social_backend.dto.statistics.StringCountProjection> countByStatusGrouped();

    @Query("SELECT CAST(r.targetType AS string) AS key, COUNT(r) AS count FROM Report r GROUP BY r.targetType")
    java.util.List<com.taihoang.social_backend.dto.statistics.StringCountProjection> countByTargetTypeGrouped();

    @Query("SELECT CAST(r.reason AS string) AS key, COUNT(r) AS count FROM Report r GROUP BY r.reason")
    java.util.List<com.taihoang.social_backend.dto.statistics.StringCountProjection> countByReasonGrouped();
}

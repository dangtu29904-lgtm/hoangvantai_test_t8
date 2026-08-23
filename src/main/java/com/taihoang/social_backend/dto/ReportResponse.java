package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Report;
import com.taihoang.social_backend.Entity.ReportReason;
import com.taihoang.social_backend.Entity.ReportStatus;
import com.taihoang.social_backend.Entity.ReportTargetType;

import java.time.LocalDateTime;

public record ReportResponse(

        Long id,

        Long reporterId,

        String reporterName,

        ReportTargetType targetType,

        Long targetId,

        ReportReason reason,

        String description,

        ReportStatus status,

        Long reviewedById,

        String reviewedByName,

        LocalDateTime reviewedAt,

        String resolutionNote,

        LocalDateTime createdAt,

        LocalDateTime updatedAt

) {
    public static ReportResponse from(Report report) {
        return new ReportResponse(
                report.getId(),
                report.getReporter().getId(),
                report.getReporter().getUserName(),
                report.getTargetType(),
                report.getTargetId(),
                report.getReason(),
                report.getDescription(),
                report.getStatus(),
                report.getReviewedBy() != null ? report.getReviewedBy().getId() : null,
                report.getReviewedBy() != null ? report.getReviewedBy().getUserName() : null,
                report.getReviewedAt(),
                report.getResolutionNote(),
                report.getCreatedAt(),
                report.getUpdatedAt()
        );
    }
}

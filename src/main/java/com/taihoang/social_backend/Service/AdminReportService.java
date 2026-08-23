package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.ReportListResponse;
import com.taihoang.social_backend.dto.ReportResolutionRequest;
import com.taihoang.social_backend.dto.ReportResponse;
import com.taihoang.social_backend.Entity.ReportReason;
import com.taihoang.social_backend.Entity.ReportStatus;
import com.taihoang.social_backend.Entity.ReportTargetType;

public interface AdminReportService {

    ReportListResponse getReports(
            ReportStatus status,
            ReportTargetType targetType,
            ReportReason reason,
            int page,
            int limit
    );

    ReportResponse getReport(Long reportId);

    ReportResponse markReviewing(Long reportId, Long adminId);

    ReportResponse resolve(Long reportId, Long adminId, ReportResolutionRequest request);

    ReportResponse reject(Long reportId, Long adminId, ReportResolutionRequest request);
}

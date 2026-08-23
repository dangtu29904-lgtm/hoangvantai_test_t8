package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.CreateReportRequest;
import com.taihoang.social_backend.dto.ReportListResponse;
import com.taihoang.social_backend.dto.ReportResponse;

public interface ReportService {

    ReportResponse reportPost(Long currentUserId, Long postId, CreateReportRequest request);

    ReportResponse reportComment(Long currentUserId, Long commentId, CreateReportRequest request);

    ReportResponse reportUser(Long currentUserId, Long targetUserId, CreateReportRequest request);

    ReportListResponse getMyReports(Long currentUserId, int page, int limit);
}

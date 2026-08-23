package com.taihoang.social_backend.dto.statistics;

import com.taihoang.social_backend.Entity.ReportReason;
import com.taihoang.social_backend.Entity.ReportStatus;
import com.taihoang.social_backend.Entity.ReportTargetType;

import java.util.Map;

public record ReportStatisticsResponse(
        long total,
        Map<ReportStatus, Long> byStatus,
        Map<ReportTargetType, Long> byTargetType,
        Map<ReportReason, Long> byReason
) {}

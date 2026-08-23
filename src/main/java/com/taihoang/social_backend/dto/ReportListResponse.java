package com.taihoang.social_backend.dto;

import java.util.List;

public record ReportListResponse(

        List<ReportResponse> items,

        int page,

        int limit,

        long total,

        int totalPages

) {}

package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReportReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReportRequest(

        @NotNull
        ReportReason reason,

        @Size(max = 1000)
        String description

) {}

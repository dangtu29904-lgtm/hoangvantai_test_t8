package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.Size;

public record ReportResolutionRequest(

        @Size(max = 2000)
        String resolutionNote

) {}

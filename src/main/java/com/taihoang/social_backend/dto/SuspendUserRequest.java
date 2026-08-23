package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.Size;

public record SuspendUserRequest(

        @Size(max = 1000)
        String reason

) {}

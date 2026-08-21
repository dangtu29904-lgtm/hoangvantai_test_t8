package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;

public record DeleteMessageForMeRequest(

        @NotNull(message = "messageId không được để trống")
        Long messageId

) {
}
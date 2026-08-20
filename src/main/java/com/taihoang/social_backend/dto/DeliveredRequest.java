package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;

public record DeliveredRequest(
        @NotNull(message = "messageId không được để trống")
        Long messageId
) {
}

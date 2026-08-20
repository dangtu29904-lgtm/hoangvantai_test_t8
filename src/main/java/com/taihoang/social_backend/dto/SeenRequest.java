package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;

public record SeenRequest(
        @NotNull(message = "messageId khong duoc de trong")
        Long messageId
) {
}

package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(
        @NotBlank(message = "refreshToken khong duoc de trong")
        String refreshToken
) {
}

package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @Email(message = "Email không hợp lệ")
        @NotBlank(message = "Email không được để trống")
        String email,

        @NotBlank(message = "Password không được để trống")
        String password
) {
}

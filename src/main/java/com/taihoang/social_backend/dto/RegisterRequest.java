package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Username không được để trống")
        String userName,

        @Email(message = "Email không hợp lệ")
        @NotBlank(message = "Email không được để trống")
        String email,

        @Size(min = 6, message = "Password phải có ít nhất 6 ký tự")
        @NotBlank(message = "Password không được để trống")
        String password
) {
}

package com.taihoang.social_backend.dto;

public record AuthResponse(
        String token,
        String tokenType,
        Long userId,
        String userName,
        String email,
        String role
) {
}

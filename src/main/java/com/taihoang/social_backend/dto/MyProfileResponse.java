package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.User;

import java.time.LocalDate;

public record MyProfileResponse(
        Long id,
        String userName,
        String email,
        String avatarUrl,
        String coverUrl,
        String bio,
        LocalDate dateOfBirth,
        User.Gender gender,
        LocalDate createdAt
) {
}
package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.User;

import java.time.LocalDate;

public record UserProfileResponse(
        Long id,
        String userName,
        String avatarUrl,
        String coverUrl,
        String bio,
        LocalDate dateOfBirth,
        User.Gender gender,
        LocalDate createdAt
) {
}

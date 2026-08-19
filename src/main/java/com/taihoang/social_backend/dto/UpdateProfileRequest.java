package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.User;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProfileRequest(

        @Size(min = 2, max = 50)
        String userName,

        @Size(max = 500)
        String bio,

        @Past
        LocalDate dateOfBirth,

        User.Gender gender
) {
}
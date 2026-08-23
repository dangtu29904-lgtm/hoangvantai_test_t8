package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record UpdateGroupAvatarRequest(

        @NotNull(message = "uploadId khong duoc de trong")
        @Positive(message = "uploadId khong hop le")
        Long uploadId

) {
}
package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EditMessageRequest(

        @NotNull(message = "messageId không được để trống")
        Long messageId,

        @NotBlank(message = "content không được để trống")
        String content

) {
}
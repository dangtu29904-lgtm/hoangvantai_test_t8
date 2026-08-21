package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record MessageRequest(

        @NotNull(message = "conversationId không được để trống")
        Long conversationId,

        @NotBlank(message = "clientMessageId không được để trống")
        String clientMessageId,

        @NotBlank(message = "content không được để trống")
        String content,

        Long replyToMessageId
) {
}
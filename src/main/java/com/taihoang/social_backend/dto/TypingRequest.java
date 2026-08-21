package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;

public record TypingRequest(

        @NotNull(
                message = "conversationId không được để trống"
        )
        Long conversationId,

        boolean typing

) {
}

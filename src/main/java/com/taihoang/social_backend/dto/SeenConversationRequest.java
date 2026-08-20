package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;

public record SeenConversationRequest(
        @NotNull(message = "conversationId khong duoc de trong")
        Long conversationId
) {
}

package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record DirectConversationRequest(
        @NotNull(message = "recipientId khong duoc de trong")
        @Positive(message = "recipientId phai lon hon 0")
        Long recipientId
) {
}
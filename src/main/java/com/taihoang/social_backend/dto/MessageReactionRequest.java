package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;
import jakarta.validation.constraints.NotNull;

public record MessageReactionRequest(

        @NotNull(message = "messageId không được để trống")
        Long messageId,

        @NotNull(message = "reaction type không được để trống")
        ReactionType type

) {
}
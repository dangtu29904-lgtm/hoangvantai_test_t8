package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;
import jakarta.validation.constraints.NotNull;

public record StoryReactionRequest(
        @NotNull
        ReactionType type
) {}

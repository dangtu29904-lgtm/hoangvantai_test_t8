package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;
import com.taihoang.social_backend.Entity.StoryReaction;

import java.time.LocalDateTime;

public record StoryReactionResponse(
        Long storyId,
        Long userId,
        ReactionType type,
        String action, // "ADD", "UPDATE", "REMOVE"
        LocalDateTime updatedAt
) {
    public static StoryReactionResponse from(StoryReaction reaction, String action) {
        return new StoryReactionResponse(
                reaction.getStory().getId(),
                reaction.getUser().getId(),
                reaction.getType(),
                action,
                reaction.getUpdatedAt() != null ? reaction.getUpdatedAt() : reaction.getCreatedAt()
        );
    }
}

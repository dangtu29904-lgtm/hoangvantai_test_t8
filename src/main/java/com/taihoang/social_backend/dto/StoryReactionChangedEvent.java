package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;
import com.taihoang.social_backend.Entity.StoryReaction;

import java.time.LocalDateTime;

/**
 * Event published after StoryReaction is committed.
 * Safe to pass to AFTER_COMMIT listener (no lazy entities).
 */
public record StoryReactionChangedEvent(
        Long storyId,
        Long actorId,
        String actorEmail,         // used to push sender sync
        String actorName,
        String actorAvatarUrl,
        String recipientEmail,     // story author email for notification destination
        ReactionType type,
        String action              // "ADD", "UPDATE", "REMOVE"
) {
    public static StoryReactionChangedEvent of(StoryReaction reaction, String action, String recipientEmail) {
        return new StoryReactionChangedEvent(
                reaction.getStory().getId(),
                reaction.getUser().getId(),
                reaction.getUser().getEmail(),
                reaction.getUser().getUserName(),
                reaction.getUser().getAvatarUrl(),
                recipientEmail,
                reaction.getType(),
                action
        );
    }

    /**
     * REMOVE event does not have a reaction entity, use fields directly
     */
    public static StoryReactionChangedEvent forRemove(
            Long storyId,
            Long actorId,
            String actorEmail,
            String actorName,
            String actorAvatarUrl,
            String recipientEmail
    ) {
        return new StoryReactionChangedEvent(
                storyId, actorId, actorEmail, actorName, actorAvatarUrl, recipientEmail, null, "REMOVE"
        );
    }
}

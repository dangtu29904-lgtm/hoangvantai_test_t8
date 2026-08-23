package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.StoryType;

import java.time.LocalDateTime;

/**
 * Lightweight Story preview embedded in MessageResponse.
 * Returns available=false when story is expired, deleted, or viewer lost access.
 */
public record StoryMessageReferenceResponse(
        Long storyId,
        boolean available,
        Long authorId,
        StoryType type,
        String mediaUrl,
        String text,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {
    public static StoryMessageReferenceResponse unavailable() {
        return new StoryMessageReferenceResponse(
                null, false, null, null, null, null, null, null
        );
    }
}

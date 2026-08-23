package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.Story;
import com.taihoang.social_backend.dto.StoryMessageReferenceResponse;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Maps a Story entity to a StoryMessageReferenceResponse.
 * Respects privacy, expiry, and soft-delete.
 * Only shows preview when story is still active and current viewer has access.
 */
@Component
public class StoryMessageReferenceMapper {

    private final StoryAccessService storyAccessService;

    public StoryMessageReferenceMapper(StoryAccessService storyAccessService) {
        this.storyAccessService = storyAccessService;
    }

    public StoryMessageReferenceResponse map(Long currentUserId, Story story) {
        if (story == null) {
            return null;
        }

        // If deleted or expired, return unavailable (no content leak)
        if (story.isDeleted()) {
            return StoryMessageReferenceResponse.unavailable();
        }

        if (story.getExpiresAt().isBefore(LocalDateTime.now())) {
            return StoryMessageReferenceResponse.unavailable();
        }

        // Check if viewer still has access (e.g., unfriended after reply)
        if (!storyAccessService.canView(currentUserId, story)) {
            return StoryMessageReferenceResponse.unavailable();
        }

        // Available: return lightweight preview (no overlays, no music)
        String mediaUrl = null;
        if (story.getMediaUpload() != null) {
            mediaUrl = story.getMediaUpload().getSecureUrl();
        }

        return new StoryMessageReferenceResponse(
                story.getId(),
                true,
                story.getAuthor().getId(),
                story.getType(),
                mediaUrl,
                story.getText(),
                story.getCreatedAt(),
                story.getExpiresAt()
        );
    }
}

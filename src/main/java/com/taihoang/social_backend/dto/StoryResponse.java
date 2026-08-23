package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;
import com.taihoang.social_backend.Entity.Story;
import com.taihoang.social_backend.Entity.StoryPrivacy;
import com.taihoang.social_backend.Entity.StoryType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public record StoryResponse(
        Long id,
        StoryAuthorResponse author,
        StoryType type,
        StoryPrivacy privacy,
        StoryMediaResponse media,
        String text,
        String backgroundColor,
        String textColor,
        List<StoryTextOverlayResponse> textOverlays,
        StoryMusicResponse music,
        boolean seen,
        ReactionType myReaction,
        long reactionCount,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) {
    public static StoryResponse from(Story story, boolean seen) {
        return from(story, seen, null, 0L);
    }

    public static StoryResponse from(Story story, boolean seen, ReactionType myReaction, long reactionCount) {
        return new StoryResponse(
                story.getId(),
                StoryAuthorResponse.from(story.getAuthor()),
                story.getType(),
                story.getPrivacy(),
                StoryMediaResponse.from(story.getMediaUpload()),
                story.getText(),
                story.getBackgroundColor(),
                story.getTextColor(),
                story.getTextOverlays() != null ? story.getTextOverlays().stream()
                        .map(StoryTextOverlayResponse::from)
                        .collect(Collectors.toList()) : List.of(),
                StoryMusicResponse.from(story),
                seen,
                myReaction,
                reactionCount,
                story.getCreatedAt(),
                story.getExpiresAt()
        );
    }
}

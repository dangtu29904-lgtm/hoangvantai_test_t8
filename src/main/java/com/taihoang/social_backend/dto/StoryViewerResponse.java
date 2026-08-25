package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;
import com.taihoang.social_backend.Entity.StoryView;

import java.time.LocalDateTime;

public record StoryViewerResponse(
        Long userId,
        String userName,
        String avatarUrl,
        LocalDateTime viewedAt,
        ReactionType reactionType
) {
    public static StoryViewerResponse from(StoryView view) {
        return from(view, null);
    }

    public static StoryViewerResponse from(StoryView view, ReactionType reactionType) {
        return new StoryViewerResponse(
                view.getViewer().getId(),
                view.getViewer().getUserName(),
                view.getViewer().getAvatarUrl(),
                view.getViewedAt(),
                reactionType
        );
    }
}

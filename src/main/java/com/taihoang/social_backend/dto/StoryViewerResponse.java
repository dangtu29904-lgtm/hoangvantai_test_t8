package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.StoryView;

import java.time.LocalDateTime;

public record StoryViewerResponse(
        Long userId,
        String userName,
        String avatarUrl,
        LocalDateTime viewedAt
) {
    public static StoryViewerResponse from(StoryView view) {
        return new StoryViewerResponse(
                view.getViewer().getId(),
                view.getViewer().getUserName(),
                view.getViewer().getAvatarUrl(),
                view.getViewedAt()
        );
    }
}

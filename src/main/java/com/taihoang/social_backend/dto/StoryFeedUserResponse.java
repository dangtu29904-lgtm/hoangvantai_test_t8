package com.taihoang.social_backend.dto;

import java.util.List;

public record StoryFeedUserResponse(
        Long authorId,
        String authorName,
        String avatarUrl,
        boolean hasUnseenStory,
        List<StoryResponse> stories
) {}

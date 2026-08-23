package com.taihoang.social_backend.dto;

import java.util.List;

public record StoryViewerListResponse(
        Long storyId,
        long totalViews,
        List<StoryViewerResponse> items,
        int page,
        int limit,
        int totalPages
) {}

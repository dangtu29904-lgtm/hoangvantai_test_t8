package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.CreateStoryRequest;
import com.taihoang.social_backend.dto.StoryFeedUserResponse;
import com.taihoang.social_backend.dto.StoryResponse;
import com.taihoang.social_backend.dto.StoryViewerListResponse;

import java.util.List;

public interface StoryService {

    StoryResponse createStory(Long currentUserId, CreateStoryRequest request);

    List<StoryFeedUserResponse> getStoryFeed(Long currentUserId);

    List<StoryResponse> getMyStories(Long currentUserId);

    StoryResponse getStory(Long currentUserId, Long storyId);

    void deleteStory(Long currentUserId, Long storyId);

    void viewStory(Long currentUserId, Long storyId);

    StoryViewerListResponse getStoryViewers(Long currentUserId, Long storyId, int page, int limit);
}

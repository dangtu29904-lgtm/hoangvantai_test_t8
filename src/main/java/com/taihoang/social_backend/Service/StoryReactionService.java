package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.StoryReactionRequest;
import com.taihoang.social_backend.dto.StoryReactionResponse;

public interface StoryReactionService {

    StoryReactionResponse reactToStory(Long currentUserId, Long storyId, StoryReactionRequest request);

    void removeReaction(Long currentUserId, Long storyId);
}

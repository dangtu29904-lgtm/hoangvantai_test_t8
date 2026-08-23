package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.MessageResponse;
import com.taihoang.social_backend.dto.StoryReplyRequest;

public interface StoryReplyService {

    /**
     * Reply to a Story with a text message.
     * - Creates or reuses 1-1 conversation between viewer (sender) and story author (recipient).
     * - Creates a Messenger with STORY_REPLY type + storyReference.
     * - Sends realtime via existing /queue/messages Chat destinations.
     * - clientMessageId is idempotent.
     * - Auto-marks Story as viewed by sender.
     */
    MessageResponse replyToStory(Long currentUserId, Long storyId, StoryReplyRequest request);
}

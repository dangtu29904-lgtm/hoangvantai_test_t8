package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.DirectConversationResponse;
import com.taihoang.social_backend.dto.GroupConversationResponse;

import java.util.List;

public interface ConversationCommandService {
    DirectConversationResponse createDirectConversation(
            Long currentUserId,
            Long recipientId
    );
    GroupConversationResponse createGroupConversation(
            Long currentUserId,
            String name,
            List<Long> memberIds
    );
}

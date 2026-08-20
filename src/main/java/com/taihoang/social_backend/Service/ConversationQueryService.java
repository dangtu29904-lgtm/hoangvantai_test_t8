package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.ConversationListResponse;

public interface ConversationQueryService {
    ConversationListResponse getConversations(
            Long currentUserId,
            String cursor,
            int limit
    );

}

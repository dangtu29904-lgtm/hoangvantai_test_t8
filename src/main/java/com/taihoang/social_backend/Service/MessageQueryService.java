package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.MessageHistoryResponse;

public interface MessageQueryService {
    MessageHistoryResponse getMessages(
            Long currentUserId,
            Long conversationId,
            Long beforeSequence,
            int limit
    );
}

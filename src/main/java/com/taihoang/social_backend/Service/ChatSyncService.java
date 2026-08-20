package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.ChatSyncResponse;

public interface ChatSyncService {
    ChatSyncResponse syncUndeliveredMessages(
            Long currentUserId,
            Long afterMessageId,
            int limit
    );
}

package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record SeenConversationResponse(
        Long conversationId,
        Long recipientId,
        String recipientName,
        LocalDateTime seenAt,
        List<Long> messageIds
) {
}

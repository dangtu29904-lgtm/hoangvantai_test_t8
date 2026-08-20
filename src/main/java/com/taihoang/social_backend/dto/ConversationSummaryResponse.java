package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Conversations;

import java.time.LocalDateTime;

public record ConversationSummaryResponse(
        Long id,
        Conversations.type_chat type,
        String name,
        String avatarUrl,
        LastMessageResponse lastMessage,
        long unreadCount,
        LocalDateTime updatedAt
) {
}

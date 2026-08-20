package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Conversations;

import java.time.LocalDate;
import java.util.List;

public record DirectConversationResponse(
        Long id,
        Conversations.type_chat type,
        LocalDate createdAt,
        List<ConversationMemberResponse> members,
        boolean created
) {
}

package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Conversations;

import java.time.LocalDate;
import java.util.List;

public record GroupConversationResponse(
        Long id,
        Conversations.type_chat type,
        String name,
        LocalDate createdAt,
        List<GroupMemberResponse> members
) {
}

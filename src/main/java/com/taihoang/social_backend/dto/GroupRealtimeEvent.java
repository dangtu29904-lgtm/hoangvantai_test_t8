package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record GroupRealtimeEvent(

        String eventId,

        GroupRealtimeEventType type,

        Long conversationId,

        Long actorUserId,

        List<Long> targetUserIds,

        String name,

        String avatarUrl,

        List<GroupMemberResponse> members,

        LocalDateTime occurredAt

) {
}
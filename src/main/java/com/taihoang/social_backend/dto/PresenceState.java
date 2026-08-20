package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record PresenceState(
        Long userId,
        String status,
        int activeSessionCount,
        LocalDateTime lastSeenAt
) {
}

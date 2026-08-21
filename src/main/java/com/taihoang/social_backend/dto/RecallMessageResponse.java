package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record RecallMessageResponse(

        Long messageId,
        Long conversationId,
        LocalDateTime recalledAt

) {
}
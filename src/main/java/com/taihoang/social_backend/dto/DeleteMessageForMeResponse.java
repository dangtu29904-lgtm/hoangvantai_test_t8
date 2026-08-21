package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record DeleteMessageForMeResponse(

        Long messageId,

        Long conversationId,

        LocalDateTime deletedAt

) {
}
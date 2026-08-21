package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record EditMessageResponse(

        Long messageId,

        Long conversationId,

        String content,

        LocalDateTime editedAt

) {
}
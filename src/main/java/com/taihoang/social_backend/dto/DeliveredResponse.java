package com.taihoang.social_backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DeliveredResponse(
        Long messageId,
        Long conversationId,
        Long recipientId,
        String recipientName,
        LocalDateTime deliveredAt
) {
}

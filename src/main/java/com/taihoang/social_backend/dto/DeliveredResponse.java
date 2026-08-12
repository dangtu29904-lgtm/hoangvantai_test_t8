package com.taihoang.social_backend.dto;

import java.time.LocalDate;

public record DeliveredResponse(
        Long messageId,
        Long conversationId,
        Long recipientId,
        String recipientName,
        LocalDate deliveredAt
) {
}

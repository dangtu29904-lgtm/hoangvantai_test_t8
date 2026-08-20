package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record LastMessageResponse(
        Long id,
        String content,
        Long senderId,
        String senderName,
        Long sequenceNumber,
        LocalDateTime sentAt
) {}



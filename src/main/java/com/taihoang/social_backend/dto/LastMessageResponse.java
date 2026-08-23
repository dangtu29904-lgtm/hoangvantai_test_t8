package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.MessageType;

import java.time.LocalDateTime;

public record LastMessageResponse(
        Long id,
        MessageType messageType,
        String content,
        Long senderId,
        String senderName,
        Long sequenceNumber,
        LocalDateTime sentAt
) {}



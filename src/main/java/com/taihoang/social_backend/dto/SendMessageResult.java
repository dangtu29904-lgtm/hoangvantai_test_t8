package com.taihoang.social_backend.dto;

import java.util.List;

public record SendMessageResult(
        MessageResponse message,
        String senderDestination,
        List<String> recipientDestinations
) {
}

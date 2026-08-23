package com.taihoang.social_backend.event;

import com.taihoang.social_backend.dto.MessageResponse;

import java.util.List;

public record SystemMessageRealtimeEvent(

        MessageResponse message,

        List<String> destinations

) {
}
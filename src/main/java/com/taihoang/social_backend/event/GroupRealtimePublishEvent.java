package com.taihoang.social_backend.event;

import com.taihoang.social_backend.dto.GroupRealtimeEvent;

import java.util.List;

public record GroupRealtimePublishEvent(

        List<String> destinations,

        GroupRealtimeEvent payload

) {
}
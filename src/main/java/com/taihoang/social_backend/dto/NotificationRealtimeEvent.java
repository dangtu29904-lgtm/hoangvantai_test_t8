package com.taihoang.social_backend.dto;

public record NotificationRealtimeEvent(

        String receiverEmail,

        NotificationItemResponse notification

) {
}
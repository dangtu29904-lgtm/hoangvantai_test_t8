package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Notification;

import java.time.LocalDateTime;

public record NotificationItemResponse(

        Long id,

        Notification.NotificationType type,

        Long actorId,

        String actorName,

        String actorAvatarUrl,

        Long referenceId,

        String message,

        boolean read,

        LocalDateTime createdAt

) {
}
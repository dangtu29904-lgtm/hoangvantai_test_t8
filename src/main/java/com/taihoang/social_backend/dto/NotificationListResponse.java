package com.taihoang.social_backend.dto;

import java.util.List;

public record NotificationListResponse(

        List<NotificationItemResponse> items,

        int page,

        int limit,

        long totalItems,

        int totalPages

) {
}
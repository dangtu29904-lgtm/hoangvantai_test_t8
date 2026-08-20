package com.taihoang.social_backend.dto;

import java.util.List;

public record FriendListResponse(
        List<FriendItemResponse> items,
        int page,
        int limit,
        long totalItems,
        int totalPages
) {
}
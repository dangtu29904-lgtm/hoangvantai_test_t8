package com.taihoang.social_backend.dto;

import java.util.List;

public record FriendRequestListResponse(
        List<FriendRequestItemResponse> items,
        int page,
        int limit,
        long totalItems,
        int totalPages
) {
}
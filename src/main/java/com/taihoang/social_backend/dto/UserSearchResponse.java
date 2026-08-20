package com.taihoang.social_backend.dto;
import java.util.List;

public record UserSearchResponse(
        List<UserSearchItemResponse> items,
        int page,
        int limit,
        long totalItems,
        int totalPages
) {
}
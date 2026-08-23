package com.taihoang.social_backend.dto;

import java.util.List;

public record SavedPostListResponse(

        List<SavedPostItemResponse> items,

        int page,

        int limit,

        long totalElements,

        int totalPages

) {
}
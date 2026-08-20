package com.taihoang.social_backend.dto;

import java.util.List;

public record PostListResponse(

        List<PostResponse> items,

        int page,

        int limit,

        long totalItems,

        int totalPages

) {
}
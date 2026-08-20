package com.taihoang.social_backend.dto;

import java.util.List;

public record CommentListResponse(

        List<CommentResponse> items,

        int page,

        int limit,

        long totalItems,

        int totalPages

) {
}
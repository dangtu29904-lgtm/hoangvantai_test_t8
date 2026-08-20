package com.taihoang.social_backend.dto;

import java.util.List;

public record MessageHistoryResponse(
        List<MessageResponse> items,
        Long nextBeforeSequence,
        boolean hasMore
) {
}
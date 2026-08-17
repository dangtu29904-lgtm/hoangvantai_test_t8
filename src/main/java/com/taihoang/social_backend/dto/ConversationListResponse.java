package com.taihoang.social_backend.dto;

import java.util.List;

public record ConversationListResponse(
        List<ConversationSummaryResponse> items,
        String nextCursor,
        boolean hasMore
) {
}

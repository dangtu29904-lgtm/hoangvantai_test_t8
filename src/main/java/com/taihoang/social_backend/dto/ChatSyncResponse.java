package com.taihoang.social_backend.dto;

import java.util.List;

public record ChatSyncResponse(
        List<MessageResponse> items,
        Long nextAfterMessageId,
        boolean hasMore
) {
}

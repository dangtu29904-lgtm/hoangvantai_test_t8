package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;

import java.util.List;
import java.util.Map;

public record ReactionListResponse(

        List<ReactionItemResponse> items,

        ReactionType myReaction,

        long totalReactions,

        Map<ReactionType, Long> reactionCounts,

        int page,

        int limit,

        int totalPages

) {
}
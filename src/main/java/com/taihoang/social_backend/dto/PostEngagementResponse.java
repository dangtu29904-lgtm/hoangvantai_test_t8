package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;

import java.util.Map;

public record PostEngagementResponse(

        long totalReactions,

        Map<ReactionType, Long> reactionCounts,

        ReactionType myReaction,

        long commentCount

) {
}
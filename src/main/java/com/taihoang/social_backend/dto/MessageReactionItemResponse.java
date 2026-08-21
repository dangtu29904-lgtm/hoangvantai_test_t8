package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;

public record MessageReactionItemResponse(

        Long userId,

        String userName,

        ReactionType type

) {
}
package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.MessageReactionAction;
import com.taihoang.social_backend.Entity.ReactionType;

public record MessageReactionResponse(

        Long messageId,

        Long conversationId,

        Long userId,

        String userName,

        ReactionType type,

        MessageReactionAction action

) {
}
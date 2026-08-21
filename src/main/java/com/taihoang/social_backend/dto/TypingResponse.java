package com.taihoang.social_backend.dto;

public record TypingResponse(

        Long conversationId,

        Long userId,

        String userName,

        boolean typing

) {
}
package com.taihoang.social_backend.dto;

public record ReplyMessageResponse(

        Long messageId,

        Long senderId,

        String senderName,

        String content ,
        boolean recalled

) {
}
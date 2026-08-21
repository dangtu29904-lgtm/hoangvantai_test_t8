package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MessageResponse(

        Long id,

        Long conversationId,

        String clientMessageId,

        Long sequenceNumber,

        Long senderId,

        String senderName,

        String content,

        LocalDateTime sentAt,

        ReplyMessageResponse replyTo,
        LocalDateTime editedAt ,
        LocalDateTime recalledAt,
        List<MessageReactionItemResponse> reactions

) {
}
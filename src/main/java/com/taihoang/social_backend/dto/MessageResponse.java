package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.MessageType;

import java.time.LocalDateTime;
import java.util.List;

public record MessageResponse(

        Long id,

        Long conversationId,

        String clientMessageId,

        Long sequenceNumber,

        MessageType messageType,

        Long senderId,

        String senderName,

        String content,

        LocalDateTime sentAt,

        ReplyMessageResponse replyTo,

        LocalDateTime editedAt,

        LocalDateTime recalledAt,

        LocalDateTime seenAt,

        List<MessageReactionItemResponse> reactions,

        List<MessageAttachmentResponse> attachments,

        StoryMessageReferenceResponse storyReference

) {
}
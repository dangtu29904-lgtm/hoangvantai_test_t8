package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record MessageRequest(

        @NotNull(
                message = "conversationId không được để trống"
        )
        Long conversationId,


        @NotBlank(
                message = "clientMessageId không được để trống"
        )
        String clientMessageId,


        @Size(
                max = 5000,
                message = "content không được vượt quá 5000 ký tự"
        )
        String content,


        Long replyToMessageId,


        @Size(
                max = 10,
                message = "Một tin nhắn chỉ được tối đa 10 file"
        )
        List<Long> uploadIds

) {
}
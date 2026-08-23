package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record StoryReplyRequest(

        @NotBlank(message = "clientMessageId khong duoc de trong")
        String clientMessageId,

        @NotBlank(message = "Noi dung reply khong duoc de trong")
        @Size(max = 5000)
        String content

) {}

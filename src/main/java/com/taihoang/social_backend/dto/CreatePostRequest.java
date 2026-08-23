package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.PostPrivacy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreatePostRequest(

        @NotBlank(message = "Noi dung bai viet khong duoc de trong")
        @Size(
                max = 5000,
                message = "Noi dung bai viet toi da 5000 ky tu"
        )
        String content,

        PostPrivacy privacy,

        @Size(
                max = 10,
                message = "Bai viet toi da 10 media"
        )
        List<@Positive(message = "mediaId khong hop le") Long> mediaIds,

        @Size(
                max = 20,
                message = "Bai viet toi da mention 20 user"
        )
        List<@Positive(message = "mentionedUserId khong hop le") Long> mentionedUserIds
) {
}
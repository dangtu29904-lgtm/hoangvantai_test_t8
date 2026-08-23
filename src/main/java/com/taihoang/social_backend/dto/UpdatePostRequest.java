package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.PostPrivacy;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdatePostRequest(

        @Size(
                max = 5000,
                message = "Noi dung bai viet toi da 5000 ky tu"
        )
        String content,

        @NotNull(
                message = "Privacy khong duoc de trong"
        )
        PostPrivacy privacy,

        @Size(
                max = 10,
                message = "Bai viet toi da 10 media"
        )
        List<
                @Positive(
                        message = "mediaId khong hop le"
                )
                        Long
                > mediaIds,

        @Size(
                max = 20,
                message = "Bai viet toi da mention 20 user"
        )
        List<
                @Positive(
                        message = "mentionedUserId khong hop le"
                )
                        Long
                > mentionedUserIds

) {
}
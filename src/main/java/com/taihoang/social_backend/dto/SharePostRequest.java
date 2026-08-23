package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.PostPrivacy;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SharePostRequest(

        @Size(
                max = 5000,
                message = "Noi dung chia se toi da 5000 ky tu"
        )
        String content,

        PostPrivacy privacy,

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
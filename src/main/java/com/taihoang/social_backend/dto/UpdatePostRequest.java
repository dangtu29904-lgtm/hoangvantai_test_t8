package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.PostPrivacy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdatePostRequest(

        @NotBlank(
                message = "Noi dung bai viet khong duoc de trong"
        )
        @Size(
                max = 5000,
                message = "Noi dung bai viet toi da 5000 ky tu"
        )
        String content,

        @NotNull(
                message = "Privacy khong duoc de trong"
        )
        PostPrivacy privacy

) {
}
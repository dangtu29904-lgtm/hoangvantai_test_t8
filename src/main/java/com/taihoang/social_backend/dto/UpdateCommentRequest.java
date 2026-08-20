package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCommentRequest(

        @NotBlank(
                message = "Noi dung binh luan khong duoc de trong"
        )
        @Size(
                max = 2000,
                message = "Binh luan toi da 2000 ky tu"
        )
        String content

) {
}
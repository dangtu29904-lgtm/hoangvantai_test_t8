package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateGroupNameRequest(

        @NotBlank(message = "Ten nhom khong duoc de trong")
        @Size(
                max = 100,
                message = "Ten nhom khong duoc vuot qua 100 ky tu"
        )
        String name

) {
}
package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record GroupConversationRequest(
        @NotBlank(message = "Ten nhom khong duoc de trong")
        @Size(max = 100, message = "Ten nhom khong duoc vuot qua 100 ky tu")
        String name,

        @NotNull(message = "memberIds khong duoc de trong")
        @Size(min = 1, max = 99, message = "Nhom phai co tu 1 den 99 thanh vien duoc moi")
        List<@NotNull @Positive Long> memberIds
) {
}

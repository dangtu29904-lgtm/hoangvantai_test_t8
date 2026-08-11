package com.taihoang.social_backend.dto;

public record ChatRequest(
        String userName ,
        String content ,
        Long id
) {
}

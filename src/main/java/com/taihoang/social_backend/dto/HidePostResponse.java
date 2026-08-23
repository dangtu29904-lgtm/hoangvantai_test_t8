package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record HidePostResponse(
        Long postId,
        boolean hidden,
        LocalDateTime hiddenAt
) {
}

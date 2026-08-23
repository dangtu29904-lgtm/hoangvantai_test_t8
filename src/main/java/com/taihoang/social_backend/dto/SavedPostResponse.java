package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record SavedPostResponse(

        Long postId,

        boolean saved,

        LocalDateTime savedAt

) {
}
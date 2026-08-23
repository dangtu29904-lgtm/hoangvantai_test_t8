package com.taihoang.social_backend.dto;

import java.time.LocalDateTime;

public record SavedPostItemResponse(

        PostResponse post,

        LocalDateTime savedAt

) {
}
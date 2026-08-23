package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.AttachmentType;

public record PostMediaResponse(
        Long id,
        Long uploadId,
        AttachmentType type,
        String url,
        String originalFileName,
        Integer sortOrder
) {
}
package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.AttachmentType;

public record ChatUploadResponse(

        Long uploadId,

        AttachmentType type,

        String url,

        String originalFileName,

        String contentType,

        Long fileSize

) {
}
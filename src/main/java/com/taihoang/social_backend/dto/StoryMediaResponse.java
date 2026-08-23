package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.AttachmentType;
import com.taihoang.social_backend.Entity.ChatUpload;

public record StoryMediaResponse(
        Long uploadId,
        AttachmentType type,
        String url,
        String originalFileName
) {
    public static StoryMediaResponse from(ChatUpload upload) {
        if (upload == null) return null;
        return new StoryMediaResponse(
                upload.getId(),
                upload.getAttachmentType(),
                upload.getSecureUrl(),
                upload.getOriginalFileName()
        );
    }
}

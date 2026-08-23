package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.StoryPrivacy;
import com.taihoang.social_backend.Entity.StoryType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateStoryRequest(
        @NotNull
        StoryType type,

        StoryPrivacy privacy,

        Long uploadId,

        @Size(max = 1000)
        String text,

        String backgroundColor,

        String textColor,

        @Size(max = 10)
        List<StoryTextOverlayRequest> textOverlays,

        Long musicTrackId,

        Long musicStartMs,

        Long musicDurationMs,

        Double musicVolume
) {}

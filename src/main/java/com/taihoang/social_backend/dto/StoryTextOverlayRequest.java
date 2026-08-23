package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record StoryTextOverlayRequest(
        @NotNull
        @Size(max = 300)
        String text,

        @NotNull
        @Min(0) @Max(1)
        Double x,

        @NotNull
        @Min(0) @Max(1)
        Double y,

        Double fontSize,
        String color,
        String fontStyle,
        Double rotation
) {}

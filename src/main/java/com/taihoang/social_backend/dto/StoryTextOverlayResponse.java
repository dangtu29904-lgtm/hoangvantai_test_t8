package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.StoryTextOverlay;

public record StoryTextOverlayResponse(
        Long id,
        String text,
        Double x,
        Double y,
        Double fontSize,
        String color,
        String fontStyle,
        Double rotation,
        Integer sortOrder
) {
    public static StoryTextOverlayResponse from(StoryTextOverlay overlay) {
        if (overlay == null) return null;
        return new StoryTextOverlayResponse(
                overlay.getId(),
                overlay.getText(),
                overlay.getX(),
                overlay.getY(),
                overlay.getFontSize(),
                overlay.getColor(),
                overlay.getFontStyle(),
                overlay.getRotation(),
                overlay.getSortOrder()
        );
    }
}

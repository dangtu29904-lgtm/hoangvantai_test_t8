package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.User;

public record StoryAuthorResponse(
        Long id,
        String userName,
        String avatarUrl
) {
    public static StoryAuthorResponse from(User user) {
        if (user == null) return null;
        return new StoryAuthorResponse(
                user.getId(),
                user.getUserName(),
                user.getAvatarUrl()
        );
    }
}

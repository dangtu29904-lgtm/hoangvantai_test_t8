package com.taihoang.social_backend.dto;

public record FriendStatusResponse(

        Long userId,

        FriendRelationshipStatus status,

        Long friendshipId

) {
}
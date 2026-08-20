package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.ReactionType;

public interface ReactionCountProjection {

    ReactionType getType();

    Long getCount();
}
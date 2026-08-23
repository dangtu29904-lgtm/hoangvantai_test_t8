package com.taihoang.social_backend.dto.statistics;

import java.time.LocalDateTime;

public interface TopPostProjection {
    Long getPostId();
    Long getAuthorId();
    String getAuthorName();
    String getContent();
    Long getReactionCount();
    Long getCommentCount();
    Long getShareCount();
    LocalDateTime getCreatedAt();
    Boolean getDeleted();
}

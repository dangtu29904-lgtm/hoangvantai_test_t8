package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.Post;

public interface PostAccessService {
    void validateCanView(
            Long currentUserId,
            Post post
    );
}

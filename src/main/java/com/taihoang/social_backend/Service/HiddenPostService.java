package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.HidePostResponse;

public interface HiddenPostService {

    HidePostResponse hidePost(
            Long currentUserId,
            Long postId
    );

    void unhidePost(
            Long currentUserId,
            Long postId
    );
}

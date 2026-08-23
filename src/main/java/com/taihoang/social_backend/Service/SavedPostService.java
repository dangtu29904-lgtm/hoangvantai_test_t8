package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.SavedPostListResponse;
import com.taihoang.social_backend.dto.SavedPostResponse;

public interface SavedPostService {

    SavedPostResponse savePost(
            Long currentUserId,
            Long postId
    );
    public void unsavePost(Long currentUserId , Long postId) ;
    SavedPostListResponse getSavedPosts(
            Long currentUserId,
            int page,
            int limit
    );
}
package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.Post;
import com.taihoang.social_backend.Entity.PostMedia;
import com.taihoang.social_backend.dto.PostResponse;

import java.util.List;

public interface PostResponseMapper {

    PostResponse toResponse(
            Long currentUserId,
            Post post
    );


    PostResponse toResponse(
            Long currentUserId,
            Post post,
            List<PostMedia> mediaList
    );
}
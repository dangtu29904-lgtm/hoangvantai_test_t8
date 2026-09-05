package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.*;

public interface PostService {
    public PostResponse createPost(Long currentUserId , CreatePostRequest request) ;
    PostDetailResponse getPost(
            Long currentUserId,
            Long postId
    );
    public PostResponse updatePost(Long currentUserId , Long postId, UpdatePostRequest request) ;
    public void deletePost(Long currentUserId , Long postId) ;
    public PostListResponse getUserPosts(Long currentUserId, Long userId , int page , int limit) ;
    public PostListResponse getFeed(Long currentUserId , int page , int limit) ;
    public PostListResponse getVideoFeed(Long currentUserId , int page , int limit) ;
    SharePostResponse sharePost(Long currentUserId, Long postId, SharePostRequest request);
}

package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.CommentListResponse;
import com.taihoang.social_backend.dto.CommentResponse;
import com.taihoang.social_backend.dto.CreateCommentRequest;
import com.taihoang.social_backend.dto.UpdateCommentRequest;

public interface PostCommentService {
    public CommentResponse createComment(Long currentUserId , Long postId , CreateCommentRequest request)  ;
    public CommentListResponse getComments(Long currentUserId , Long postId, int page ,int limit) ;
    public CommentResponse updateComment(Long currentUserId , Long commentId , UpdateCommentRequest request) ;
    public void deleteComment(Long currentUserId , Long commentId ) ;
    CommentResponse createReply(
            Long currentUserId,
            Long parentCommentId,
            CreateCommentRequest request
    );
}

package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.ReactionListResponse;
import com.taihoang.social_backend.dto.ReactionRequest;
import com.taihoang.social_backend.dto.ReactionResponse;

public interface PostReactionService {
    ReactionResponse reactToPost(Long currentUserId , Long postId , ReactionRequest request) ;
    public void removeReaction(Long currentUserId , Long postId )  ;
    public ReactionListResponse getPostReactions(Long currentUserId ,Long postId , int page , int limit)  ;
 }

package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.FriendListResponse;
import com.taihoang.social_backend.dto.FriendRequestListResponse;
import com.taihoang.social_backend.dto.FriendRequestResponse;
import com.taihoang.social_backend.dto.FriendStatusResponse;

public interface FriendshipService {
    public FriendRequestResponse sendFriendRequest(Long currentUserId, Long receiverId);
    public FriendRequestListResponse getReceivedRequests(Long currentUserId , int page , int limit) ;
    public FriendRequestResponse acceptFriendRequest(Long currentUserId , Long requestId) ;
    public FriendRequestResponse rejectFriendRequest(Long currentUserId, Long requestId);
    public FriendListResponse getFriends(Long currentUserId , int page , int limit) ;
    public void unfriend(Long currentUserId , Long friendId) ;
    public FriendStatusResponse getFriendStatus(Long currentUserId , Long targetUserId) ;
    public FriendRequestListResponse getSentRequests(Long currentUserId , int page , int limit)  ;
    public void cancelFriendRequest(Long currentUserId , Long requestId) ;
    public FriendListResponse getUserFriends(Long userId , int page , int limit) ;
}

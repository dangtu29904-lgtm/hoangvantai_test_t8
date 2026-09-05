package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.Notification;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.dto.*;

public interface NotificationService {
    public NotificationListResponse getNotifications(Long currentUserId, int page , int limit) ;
    public NotificationItemResponse createFriendRequestNotification(User actor , User receiver , Long friendshipId)  ;
    public NotificationReadResponse markAsRead(Long currentUserId , Long notificationId) ;
    public NotificationReadAllResponse markAllAsRead(Long currentUserId) ;
    public UnreadNotificationCountResponse getUnreadCount(Long currentUserId) ;
    public NotificationItemResponse createFriendAcceptedNotification(User actor, User receiver, Long friendshipId);
    
    public void notifyPostReaction(User actor, com.taihoang.social_backend.Entity.Post post);
    
    public void notifyPostComment(User actor, com.taihoang.social_backend.Entity.Post post, com.taihoang.social_backend.Entity.PostComment comment);
    
    public void notifyCommentReply(User actor, com.taihoang.social_backend.Entity.Post post, com.taihoang.social_backend.Entity.PostComment reply, User parentCommentAuthor);
    
    public void notifyPostShare(User actor, com.taihoang.social_backend.Entity.Post originalPost, com.taihoang.social_backend.Entity.Post sharedPost);
    
    public void notifyPostMention(User actor, com.taihoang.social_backend.Entity.Post post, User mentionedUser);
    
    public void notifyStoryReaction(User actor, com.taihoang.social_backend.Entity.Story story);

    public void notifySecurityLogin(User user, com.taihoang.social_backend.Entity.UserDevice userDevice);
}

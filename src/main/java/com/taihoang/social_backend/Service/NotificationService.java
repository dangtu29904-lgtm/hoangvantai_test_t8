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
}

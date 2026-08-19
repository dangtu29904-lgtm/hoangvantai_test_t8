package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Notification;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.NotificationRepository;
import com.taihoang.social_backend.Service.NotificationService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;
    @Override
    public NotificationListResponse getNotifications(
            Long currentUserId,
            int page,
            int limit
    ) {

        if (currentUserId == null || currentUserId <= 0) {

            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (page < 0) {

            throw new IllegalArgumentException(
                    "Page khong hop le"
            );
        }

        if (limit < 1 || limit > 50) {

            throw new IllegalArgumentException(
                    "Limit phai nam trong khoang 1 den 50"
            );
        }

        PageRequest pageable = PageRequest.of(
                page,
                limit,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );

        Page<Notification> result =
                notificationRepository.findByReceiver_Id(
                        currentUserId,
                        pageable
                );

        var items = result.getContent()
                .stream()
                .map(this::toResponse)
                .toList();

        return new NotificationListResponse(
                items,
                page,
                limit,
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    private NotificationItemResponse toResponse(
            Notification notification
    ) {

        return new NotificationItemResponse(

                notification.getId(),

                notification.getType(),

                notification.getActor().getId(),

                notification.getActor().getUserName(),

                notification.getActor().getAvatarUrl(),

                notification.getReferenceId(),

                buildMessage(notification),

                notification.isRead(),

                notification.getCreatedAt()
        );
    }

    private String buildMessage(
            Notification notification
    ) {

        String actorName =
                notification.getActor().getUserName();

        return switch (notification.getType()) {

            case FRIEND_REQUEST ->
                    actorName
                            + " da gui cho ban loi moi ket ban";

            case FRIEND_ACCEPTED ->
                    actorName
                            + " da chap nhan loi moi ket ban";

            case POST_LIKE ->
                    actorName
                            + " da thich bai viet cua ban";

            case POST_COMMENT ->
                    actorName
                            + " da binh luan bai viet cua ban";

            case NEW_MESSAGE ->
                    actorName
                            + " da gui cho ban mot tin nhan";
        };
    }
    @Override
    public NotificationItemResponse
    createFriendRequestNotification(

            User actor,
            User receiver,
            Long friendshipId
    ) {

        Notification notification =
                new Notification();

        notification.setActor(actor);

        notification.setReceiver(receiver);

        notification.setType(
                Notification.NotificationType.FRIEND_REQUEST
        );

        notification.setReferenceId(
                friendshipId
        );

        notification.setRead(false);

        Notification saved =
                notificationRepository.save(notification);

        NotificationItemResponse response =
                toResponse(saved);

        eventPublisher.publishEvent(
                new NotificationRealtimeEvent(
                        receiver.getEmail(),
                        response
                )
        );

        return response;
    }
    @Transactional
    public NotificationReadResponse markAsRead(
            Long currentUserId,
            Long notificationId
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (notificationId == null || notificationId <= 0) {
            throw new IllegalArgumentException(
                    "notificationId khong hop le"
            );
        }

        Notification notification =
                notificationRepository
                        .findByIdAndReceiver_Id(
                                notificationId,
                                currentUserId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay notification"
                                )
                        );

        /*
         * Đã read rồi thì không cần update lại.
         */
        if (!notification.isRead()) {

            notification.setRead(true);

            notificationRepository.save(notification);
        }

        return new NotificationReadResponse(
                notification.getId(),
                true
        );
    }
    @Transactional
    public NotificationReadAllResponse markAllAsRead(
            Long currentUserId
    ) {

        if (currentUserId == null || currentUserId <= 0) {

            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        int updatedCount =
                notificationRepository.markAllAsRead(
                        currentUserId
                );

        return new NotificationReadAllResponse(
                updatedCount
        );
    }
    public UnreadNotificationCountResponse getUnreadCount(
            Long currentUserId
    ) {

        if (currentUserId == null || currentUserId <= 0) {

            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        long unreadCount =
                notificationRepository
                        .countByReceiver_IdAndReadFalse(
                                currentUserId
                        );

        return new UnreadNotificationCountResponse(
                unreadCount
        );
    }
    public NotificationItemResponse
    createFriendAcceptedNotification(

            User actor,
            User receiver,
            Long friendshipId
    ) {

        Notification notification =
                new Notification();

        notification.setActor(actor);

        notification.setReceiver(receiver);

        notification.setType(
                Notification.NotificationType.FRIEND_ACCEPTED
        );

        notification.setReferenceId(
                friendshipId
        );

        notification.setRead(false);

        Notification saved =
                notificationRepository.save(notification);

        NotificationItemResponse response =
                toResponse(saved);

        eventPublisher.publishEvent(
                new NotificationRealtimeEvent(
                        receiver.getEmail(),
                        response
                )
        );

        return response;
    }
}

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
    private final com.taihoang.social_backend.Repository.UserRepository userRepository;
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
                
                notification.getPost() != null ? notification.getPost().getId() : null,
                
                notification.getComment() != null ? notification.getComment().getId() : null,

                notification.getStory() != null ? notification.getStory().getId() : null,

                buildMessage(notification),

                notification.isRead(),

                notification.getCreatedAt(),
                
                notification.getReadAt()
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
                            + " da binh luan ve bai viet cua ban";

            case NEW_MESSAGE ->
                    actorName
                            + " da gui cho ban mot tin nhan";
                            
            case POST_REACTION ->
                    actorName 
                            + " da bay to cam xuc ve bai viet cua ban";
                            
            case COMMENT_REPLY ->
                    actorName 
                            + " da tra loi binh luan cua ban";
                            
            case POST_SHARE ->
                    actorName 
                            + " da chia se bai viet cua ban";
                            
            case POST_MENTION ->
                    actorName 
                            + " da nhac den ban trong mot bai viet";

            case STORY_REACTION ->
                    actorName
                            + " da bay to cam xuc ve tin cua ban";
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
            notification.setReadAt(java.time.LocalDateTime.now());

            notificationRepository.save(notification);
            
            eventPublisher.publishEvent(
                    new NotificationUnreadCountEvent(
                            notification.getReceiver().getEmail()
                    )
            );
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
                
        if (updatedCount > 0) {
            userRepository.findById(currentUserId).ifPresent(user -> {
                eventPublisher.publishEvent(
                        new NotificationUnreadCountEvent(
                                user.getEmail()
                        )
                );
            });
        }

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
    
    private void saveAndPublishNotification(Notification notification) {
        Notification saved = notificationRepository.save(notification);
        NotificationItemResponse response = toResponse(saved);
        eventPublisher.publishEvent(
                new NotificationRealtimeEvent(
                        notification.getReceiver().getEmail(),
                        response
                )
        );
    }
    
    @Override
    @Transactional
    public void notifyPostReaction(User actor, com.taihoang.social_backend.Entity.Post post) {
        if (actor.getId().equals(post.getAuthor().getId())) {
            return;
        }
        // Deduplicate reaction (only 1 POST_REACTION per actor and post)
        notificationRepository.findByReceiver_IdAndActor_IdAndTypeAndPost_Id(
                post.getAuthor().getId(),
                actor.getId(),
                Notification.NotificationType.POST_REACTION,
                post.getId()
        ).ifPresentOrElse(
            existing -> {
                // If it already exists, you may choose to update the timestamp or leave it. We leave it to avoid spam.
            },
            () -> {
                Notification notification = new Notification();
                notification.setReceiver(post.getAuthor());
                notification.setActor(actor);
                notification.setType(Notification.NotificationType.POST_REACTION);
                notification.setPost(post);
                notification.setRead(false);
                saveAndPublishNotification(notification);
            }
        );
    }
    
    @Override
    @Transactional
    public void notifyPostComment(User actor, com.taihoang.social_backend.Entity.Post post, com.taihoang.social_backend.Entity.PostComment comment) {
        if (actor.getId().equals(post.getAuthor().getId())) {
            return;
        }
        
        Notification notification = new Notification();
        notification.setReceiver(post.getAuthor());
        notification.setActor(actor);
        notification.setType(Notification.NotificationType.POST_COMMENT);
        notification.setPost(post);
        notification.setComment(comment);
        notification.setRead(false);
        saveAndPublishNotification(notification);
    }
    
    @Override
    @Transactional
    public void notifyCommentReply(User actor, com.taihoang.social_backend.Entity.Post post, com.taihoang.social_backend.Entity.PostComment reply, User parentCommentAuthor) {
        if (actor.getId().equals(parentCommentAuthor.getId())) {
            return;
        }
        
        Notification notification = new Notification();
        notification.setReceiver(parentCommentAuthor);
        notification.setActor(actor);
        notification.setType(Notification.NotificationType.COMMENT_REPLY);
        notification.setPost(post);
        notification.setComment(reply);
        notification.setRead(false);
        saveAndPublishNotification(notification);
    }
    
    @Override
    @Transactional
    public void notifyPostShare(User actor, com.taihoang.social_backend.Entity.Post originalPost, com.taihoang.social_backend.Entity.Post sharedPost) {
        if (actor.getId().equals(originalPost.getAuthor().getId())) {
            return;
        }
        
        Notification notification = new Notification();
        notification.setReceiver(originalPost.getAuthor());
        notification.setActor(actor);
        notification.setType(Notification.NotificationType.POST_SHARE);
        // post is the original post so clicking it goes to the original post (or sharedPost depending on UX, we use sharedPost as the context and reference the original)
        // Usually, the notification says "X shared your post", clicking it might go to the shared post or original. Let's use sharedPost.
        notification.setPost(sharedPost);
        notification.setRead(false);
        saveAndPublishNotification(notification);
    }
    
    @Override
    @Transactional
    public void notifyPostMention(User actor, com.taihoang.social_backend.Entity.Post post, User mentionedUser) {
        if (actor.getId().equals(mentionedUser.getId())) {
            return;
        }
        
        Notification notification = new Notification();
        notification.setReceiver(mentionedUser);
        notification.setActor(actor);
        notification.setType(Notification.NotificationType.POST_MENTION);
        notification.setPost(post);
        notification.setRead(false);
        saveAndPublishNotification(notification);
    }

    @Override
    @Transactional
    public void notifyStoryReaction(User actor, com.taihoang.social_backend.Entity.Story story) {
        // No self-notification
        if (actor.getId().equals(story.getAuthor().getId())) {
            return;
        }
        // Deduplicate: max 1 STORY_REACTION per actor+story
        notificationRepository
            .findByReceiver_IdAndActor_IdAndTypeAndStory_Id(
                    story.getAuthor().getId(),
                    actor.getId(),
                    Notification.NotificationType.STORY_REACTION,
                    story.getId()
            )
            .ifPresentOrElse(
                existing -> { /* already notified, skip */ },
                () -> {
                    Notification notification = new Notification();
                    notification.setReceiver(story.getAuthor());
                    notification.setActor(actor);
                    notification.setType(Notification.NotificationType.STORY_REACTION);
                    notification.setStory(story);
                    notification.setRead(false);
                    saveAndPublishNotification(notification);
                }
            );
    }
}

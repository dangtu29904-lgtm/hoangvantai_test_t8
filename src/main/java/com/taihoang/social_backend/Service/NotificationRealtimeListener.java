package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.NotificationRealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class NotificationRealtimeListener {

    private final SimpMessagingTemplate messagingTemplate;
    
    private final com.taihoang.social_backend.Repository.NotificationRepository notificationRepository;
    private final com.taihoang.social_backend.Repository.UserRepository userRepository;

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void handleNotification(
            NotificationRealtimeEvent event
    ) {

        messagingTemplate.convertAndSendToUser(
                event.receiverEmail(),
                "/queue/notifications",
                event.notification()
        );
        
        // Push unread count after sending notification
        handleUnreadCount(new com.taihoang.social_backend.dto.NotificationUnreadCountEvent(event.receiverEmail()));
    }
    
    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true
    )
    public void handleUnreadCount(
            com.taihoang.social_backend.dto.NotificationUnreadCountEvent event
    ) {
        userRepository.findByEmail(event.receiverEmail()).ifPresent(user -> {
            long count = notificationRepository.countByReceiver_IdAndReadFalse(user.getId());
            messagingTemplate.convertAndSendToUser(
                    event.receiverEmail(),
                    "/queue/notifications.unread-count",
                    new com.taihoang.social_backend.dto.UnreadNotificationCountResponse(count)
            );
        });
    }
}
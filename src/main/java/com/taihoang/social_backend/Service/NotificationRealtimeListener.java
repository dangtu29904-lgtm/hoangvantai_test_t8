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
    }
}
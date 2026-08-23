package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.event.SystemMessageRealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class SystemMessageRealtimeEventListener {

    private final SimpMessagingTemplate
            messagingTemplate;


    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT
    )
    public void handle(
            SystemMessageRealtimeEvent event
    ) {

        event.destinations()
                .stream()

                .distinct()

                .forEach(destination ->

                        messagingTemplate
                                .convertAndSendToUser(

                                        destination,

                                        "/queue/messages",

                                        event.message()
                                )
                );
    }
}
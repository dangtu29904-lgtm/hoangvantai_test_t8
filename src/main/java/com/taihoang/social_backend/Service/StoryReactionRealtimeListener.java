package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.StoryReactionChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class StoryReactionRealtimeListener {

    private final SimpMessagingTemplate messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleStoryReactionChanged(StoryReactionChangedEvent event) {
        // Send to story author
        messagingTemplate.convertAndSendToUser(
                event.recipientEmail(),
                "/queue/story.reactions",
                event
        );
    }
}

package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.dto.PresenceState;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PresenceNotificationService {

    private final ConversationMemberRepository conversationMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public void notifyContacts(PresenceState state) {
        conversationMemberRepository.findPresenceRecipientDestinations(state.userId())
                .forEach(destination -> messagingTemplate.convertAndSendToUser(
                        destination,
                        "/queue/presence",
                        state
                ));
    }
}


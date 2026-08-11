package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.dto.ChatRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Configuration
@RequiredArgsConstructor
public class ChatController {
    private final SimpMessagingTemplate messagingTemplate ;
    @MessageMapping("/chat.send")
    public void sendMessage(ChatRequest request)
    {
        messagingTemplate.convertAndSend(
                "/topic/conversations/"+ request.id(),
                request);
    }
}

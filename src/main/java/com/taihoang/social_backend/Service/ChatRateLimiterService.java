package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.MessageRequest;
import com.taihoang.social_backend.exception.ChatRateLimitException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class ChatRateLimiterService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ChatRateLimiterService.class);

    private final StringRedisTemplate redisTemplate;
    private final ChatObservabilityService chatObservabilityService;
    private final long messagesPerSecond;
    private final long messagesPerMinute;
    private final long attachmentsPerMinute;

    public ChatRateLimiterService(
            StringRedisTemplate redisTemplate,
            ChatObservabilityService chatObservabilityService,
            @Value("${chat.rate-limit.messages-per-second:5}") long messagesPerSecond,
            @Value("${chat.rate-limit.messages-per-minute:30}") long messagesPerMinute,
            @Value("${chat.rate-limit.attachments-per-minute:10}") long attachmentsPerMinute
    ) {
        this.redisTemplate = redisTemplate;
        this.chatObservabilityService = chatObservabilityService;
        this.messagesPerSecond = messagesPerSecond;
        this.messagesPerMinute = messagesPerMinute;
        this.attachmentsPerMinute = attachmentsPerMinute;
    }

    public void checkSendAllowed(Long senderId, MessageRequest request) {
        hitWindow(
                "chat:rate:send:sec:user:" + senderId,
                1,
                messagesPerSecond,
                Duration.ofSeconds(1),
                "Ban gui tin nhan qua nhanh, vui long thu lai sau vai giay.",
                "message_second",
                senderId,
                request
        );

        hitWindow(
                "chat:rate:send:min:user:" + senderId,
                1,
                messagesPerMinute,
                Duration.ofMinutes(1),
                "Ban gui qua nhieu tin nhan trong mot phut, vui long cho mot lat.",
                "message_minute",
                senderId,
                request
        );

        int uploadCount = request.uploadIds() == null ? 0 : request.uploadIds().size();
        if (uploadCount > 0) {
            hitWindow(
                    "chat:rate:attachment:min:user:" + senderId,
                    uploadCount,
                    attachmentsPerMinute,
                    Duration.ofMinutes(1),
                    "Ban gui qua nhieu file dinh kem, vui long cho mot lat.",
                    "attachment_minute",
                    senderId,
                    request
            );
        }
    }

    private void hitWindow(
            String key,
            long amount,
            long limit,
            Duration ttl,
            String message,
            String scope,
            Long senderId,
            MessageRequest request
    ) {
        if (limit <= 0) {
            return;
        }

        try {
            Long current = redisTemplate.opsForValue().increment(key, amount);
            if (current != null && current == amount) {
                redisTemplate.expire(key, ttl);
            }

            if (current != null && current > limit) {
                chatObservabilityService.rateLimited(
                        senderId,
                        request.conversationId(),
                        request.clientMessageId(),
                        scope
                );
                throw new ChatRateLimitException(
                        message,
                        request.clientMessageId(),
                        request.conversationId(),
                        Math.max(1, ttl.toSeconds())
                );
            }
        } catch (ChatRateLimitException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            LOGGER.warn("Chat rate limiter skipped because Redis is unavailable. key={}", key, exception);
        }
    }
}

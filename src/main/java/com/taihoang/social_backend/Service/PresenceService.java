package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.PresenceState;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class PresenceService {
    private static final Duration PRESENCE_TTL = Duration.ofSeconds(45);
    private final RedisTemplate<String, Object> redisTemplate;

    public PresenceService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void markOnline(Long userId, String sessionId) {
        writePresence(userId, "online", sessionId);
    }

    public void markOffline(Long userId, String sessionId) {
        writePresence(userId, "offline", sessionId);
    }

    public void touch(Long userId, String sessionId) {
        writePresence(userId, "online", sessionId);
    }

    public PresenceState getPresence(Long userId) {
        Object value = redisTemplate.opsForValue().get(key(userId));
        return value instanceof PresenceState state ? state : null;
    }

    private void writePresence(Long userId, String status, String sessionId) {
        PresenceState state = new PresenceState(
                userId,
                status,
                sessionId,
                LocalDateTime.now()
        );
        redisTemplate.opsForValue().set(key(userId), state, PRESENCE_TTL);
    }

    private String key(Long userId) {
        return "presence:user:" + userId;
    }
}

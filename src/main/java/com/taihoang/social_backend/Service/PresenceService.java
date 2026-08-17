package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.PresenceState;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

@Service
public class PresenceService {
    private static final Duration SESSION_TTL  = Duration.ofSeconds(45);
    private static final Duration SESSION_INDEX_TTL = Duration.ofSeconds(90);
    private final RedisTemplate<String, Object> redisTemplate;

    public PresenceService(RedisTemplate<String, Object> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }
    // void
    public boolean markOnline(Long userId, String sessionId) {
        validate(userId, sessionId);
        boolean wasOnline = activeSessionCount(userId) > 0;
        registerSession(userId, sessionId);
        return !wasOnline;
//        writePresence(userId, "online", sessionId);
    }

    public boolean markOffline(Long userId, String sessionId) {
        validate(userId, sessionId);
        int sessionsBeforeDisconnect = activeSessionCount(userId);

        redisTemplate.opsForZSet().remove(sessionIndexKey(userId), sessionId);
        writeLastActiveAt(userId, LocalDateTime.now());

        int sessionsAfterDisconnect = activeSessionCount(userId);
        return sessionsBeforeDisconnect > 0 && sessionsAfterDisconnect == 0;
//        writePresence(userId, "offline", sessionId);
    }

    public boolean touch(Long userId, String sessionId) {

        return markOnline(userId,sessionId);
    }

    public PresenceState getPresence(Long userId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId khong hop le");
        }

        int activeSessionCount = activeSessionCount(userId);
        boolean online = activeSessionCount > 0;

        return new PresenceState(
                userId,
                online ? "online" : "offline",
                activeSessionCount,
                online ? null : readLastActiveAt(userId)
        );
//        Object value = redisTemplate.opsForValue().get(key(userId));
//        return value instanceof PresenceState state ? state : null;
    }

//    private void writePresence(Long userId, String status, String sessionId) {
//        PresenceState state = new PresenceState(
//                userId,
//                status,
//                sessionId,
//                LocalDateTime.now()
//        );
//        redisTemplate.opsForValue().set(key(userId), state, PRESENCE_TTL);
//    }
//
//    private String key(Long userId) {
//        return "presence:user:" + userId;
//    }
    private void registerSession(Long userId, String sessionId) {
        LocalDateTime now = LocalDateTime.now();
        double expiresAt = System.currentTimeMillis() + SESSION_TTL.toMillis();

        redisTemplate.opsForZSet().add(
                sessionIndexKey(userId),
                sessionId,
                expiresAt
        );
        redisTemplate.expire(sessionIndexKey(userId), SESSION_INDEX_TTL);
        writeLastActiveAt(userId, now);
    }

    private int activeSessionCount(Long userId) {
        String key = sessionIndexKey(userId);
        redisTemplate.opsForZSet().removeRangeByScore(
                key,
                Double.NEGATIVE_INFINITY,
                System.currentTimeMillis()
        );

        Long count = redisTemplate.opsForZSet().zCard(key);
        return count == null ? 0 : count.intValue();
    }

    private void writeLastActiveAt(Long userId, LocalDateTime lastActiveAt) {
        redisTemplate.opsForValue().set(lastActiveKey(userId), lastActiveAt.toString());
    }

    private LocalDateTime readLastActiveAt(Long userId) {
        String value = redisTemplate.opsForValue().get(lastActiveKey(userId));
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    private void validate(Long userId, String sessionId) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("userId khong hop le");
        }
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("WebSocket sessionId khong hop le");
        }
    }

    private String sessionIndexKey(Long userId) {
        return "presence:user:" + userId + ":sessions";
    }

    private String lastActiveKey(Long userId) {
        return "presence:user:" + userId + ":last-active";
    }
}

package com.taihoang.social_backend.Service;

import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatObservabilityService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ChatObservabilityService.class);

    private final MeterRegistry meterRegistry;
    private final Set<String> activeWebSocketSessions = ConcurrentHashMap.newKeySet();

    public ChatObservabilityService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        Gauge.builder("chat.websocket.sessions.active", activeWebSocketSessions, Set::size)
                .description("Current active STOMP WebSocket sessions on this backend instance")
                .register(meterRegistry);
    }

    public void messageSendSuccess(
            Long userId,
            Long conversationId,
            Long messageId,
            int recipientCount,
            boolean duplicate
    ) {
        counter("chat.messages.sent", "duplicate", String.valueOf(duplicate)).increment();
        summary("chat.messages.recipients").record(recipientCount);
        LOGGER.info(
                "CHAT_SEND_SUCCESS userId={} conversationId={} messageId={} recipients={} duplicate={}",
                userId,
                conversationId,
                messageId,
                recipientCount,
                duplicate
        );
    }

    public void messageDelivered(
            Long userId,
            Long conversationId,
            Long messageId,
            boolean alreadyDelivered,
            LocalDateTime sentAt
    ) {
        counter("chat.messages.delivered", "duplicate", String.valueOf(alreadyDelivered)).increment();
        recordMessageDelay("delivered", sentAt);
        LOGGER.info(
                "CHAT_DELIVERED userId={} conversationId={} messageId={} duplicate={}",
                userId,
                conversationId,
                messageId,
                alreadyDelivered
        );
    }

    public void messageSeen(
            Long userId,
            Long conversationId,
            Long messageId,
            boolean alreadySeen,
            LocalDateTime sentAt
    ) {
        counter("chat.messages.seen", "scope", "message", "duplicate", String.valueOf(alreadySeen)).increment();
        recordMessageDelay("seen", sentAt);
        LOGGER.info(
                "CHAT_SEEN userId={} conversationId={} messageId={} duplicate={}",
                userId,
                conversationId,
                messageId,
                alreadySeen
        );
    }

    public void conversationSeen(Long userId, Long conversationId, int messageCount) {
        counter("chat.messages.seen", "scope", "conversation", "duplicate", String.valueOf(messageCount == 0)).increment();
        summary("chat.seen.conversation.messages").record(messageCount);
        LOGGER.info(
                "CHAT_CONVERSATION_SEEN userId={} conversationId={} messages={}",
                userId,
                conversationId,
                messageCount
        );
    }

    public void messageEdited(Long userId, Long conversationId, Long messageId) {
        counter("chat.messages.edited").increment();
        LOGGER.info("CHAT_MESSAGE_EDITED userId={} conversationId={} messageId={}", userId, conversationId, messageId);
    }

    public void messageRecalled(Long userId, Long conversationId, Long messageId, boolean duplicate) {
        counter("chat.messages.recalled", "duplicate", String.valueOf(duplicate)).increment();
        LOGGER.info("CHAT_MESSAGE_RECALLED userId={} conversationId={} messageId={} duplicate={}", userId, conversationId, messageId, duplicate);
    }

    public void messageDeletedForMe(Long userId, Long conversationId, Long messageId, boolean duplicate) {
        counter("chat.messages.deleted_for_me", "duplicate", String.valueOf(duplicate)).increment();
        LOGGER.info("CHAT_MESSAGE_DELETED_FOR_ME userId={} conversationId={} messageId={} duplicate={}", userId, conversationId, messageId, duplicate);
    }

    public void messageReaction(Long userId, Long conversationId, Long messageId, String action) {
        counter("chat.messages.reactions", "action", action == null ? "UNKNOWN" : action).increment();
        LOGGER.info("CHAT_MESSAGE_REACTION userId={} conversationId={} messageId={} action={}", userId, conversationId, messageId, action);
    }

    public void typing(Long userId, Long conversationId, boolean typing, int recipientCount) {
        counter("chat.typing.events", "typing", String.valueOf(typing)).increment();
        LOGGER.debug(
                "CHAT_TYPING userId={} conversationId={} typing={} recipients={}",
                userId,
                conversationId,
                typing,
                recipientCount
        );
    }

    public void offlineSync(Long userId, int messageCount, boolean hasMore) {
        counter("chat.sync.requests", "hasMore", String.valueOf(hasMore)).increment();
        summary("chat.sync.messages").record(messageCount);
        LOGGER.info("CHAT_OFFLINE_SYNC userId={} messages={} hasMore={}", userId, messageCount, hasMore);
    }

    public void rateLimited(Long userId, Long conversationId, String clientMessageId, String scope) {
        counter("chat.rate_limited", "scope", scope == null ? "unknown" : scope).increment();
        LOGGER.warn(
                "CHAT_RATE_LIMITED userId={} conversationId={} clientMessageId={} scope={}",
                userId,
                conversationId,
                clientMessageId,
                scope
        );
    }

    public void websocketConnected(Long userId, String sessionId, boolean becameOnline) {
        if (sessionId != null && !sessionId.isBlank()) {
            activeWebSocketSessions.add(sessionId);
        }
        counter("chat.websocket.connected", "becameOnline", String.valueOf(becameOnline)).increment();
        LOGGER.info("CHAT_WS_CONNECTED userId={} sessionId={} becameOnline={}", userId, sessionId, becameOnline);
    }

    public void websocketDisconnected(Long userId, String sessionId, boolean becameOffline) {
        if (sessionId != null && !sessionId.isBlank()) {
            activeWebSocketSessions.remove(sessionId);
        }
        counter("chat.websocket.disconnected", "becameOffline", String.valueOf(becameOffline)).increment();
        LOGGER.info("CHAT_WS_DISCONNECTED userId={} sessionId={} becameOffline={}", userId, sessionId, becameOffline);
    }

    public void websocketError(String code, String exceptionName) {
        counter(
                "chat.websocket.errors",
                "code",
                code == null ? "UNKNOWN" : code,
                "exception",
                exceptionName == null ? "UNKNOWN" : exceptionName
        ).increment();
        LOGGER.warn("CHAT_WS_ERROR code={} exception={}", code, exceptionName);
    }

    private void recordMessageDelay(String stage, LocalDateTime sentAt) {
        if (sentAt == null) {
            return;
        }

        Duration delay = Duration.between(sentAt, LocalDateTime.now());
        if (delay.isNegative()) {
            return;
        }

        Timer.builder("chat.messages.stage.delay")
                .tag("stage", stage)
                .description("Delay from message sentAt to delivered/seen acknowledgement")
                .register(meterRegistry)
                .record(delay);
    }

    private io.micrometer.core.instrument.Counter counter(String name, String... tags) {
        return meterRegistry.counter(name, tags);
    }

    private DistributionSummary summary(String name) {
        return DistributionSummary.builder(name)
                .register(meterRegistry);
    }
}

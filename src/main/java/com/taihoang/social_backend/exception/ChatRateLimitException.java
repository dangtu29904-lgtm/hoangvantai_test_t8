package com.taihoang.social_backend.exception;

public class ChatRateLimitException extends RuntimeException {

    private final String clientMessageId;
    private final Long conversationId;
    private final long retryAfterSeconds;

    public ChatRateLimitException(
            String message,
            String clientMessageId,
            Long conversationId,
            long retryAfterSeconds
    ) {
        super(message);
        this.clientMessageId = clientMessageId;
        this.conversationId = conversationId;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public String getClientMessageId() {
        return clientMessageId;
    }

    public Long getConversationId() {
        return conversationId;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}

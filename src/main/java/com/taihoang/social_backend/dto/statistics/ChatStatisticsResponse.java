package com.taihoang.social_backend.dto.statistics;

public record ChatStatisticsResponse(
        long totalConversations,
        long directConversations,
        long groupConversations,
        long totalMessages,
        long messagesToday,
        long messagesLast7Days
) {}

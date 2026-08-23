package com.taihoang.social_backend.dto.statistics;

public record AdminOverviewStatisticsResponse(
        UserOverviewStatisticsResponse users,
        PostOverviewStatisticsResponse posts,
        CommentOverviewStatisticsResponse comments,
        MessageOverviewStatisticsResponse messages,
        StoryOverviewStatisticsResponse stories,
        ReportOverviewStatisticsResponse reports
) {}

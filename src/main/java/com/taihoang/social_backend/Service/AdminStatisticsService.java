package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.statistics.*;

import java.util.List;

public interface AdminStatisticsService {

    AdminOverviewStatisticsResponse getOverview();

    GrowthStatisticsResponse getGrowth(StatisticMetric metric, StatisticPeriod period);

    List<TopPostStatisticsResponse> getTopPosts(StatisticPeriod period, int limit);

    List<ActiveUserStatisticsResponse> getActiveUsers(StatisticPeriod period, int limit);

    ReportStatisticsResponse getReportStatistics();

    StoryStatisticsResponse getStoryStatistics();

    ChatStatisticsResponse getChatStatistics();
}

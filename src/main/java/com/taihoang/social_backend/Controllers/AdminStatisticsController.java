package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.AdminStatisticsService;
import com.taihoang.social_backend.dto.statistics.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/statistics")
@RequiredArgsConstructor
public class AdminStatisticsController {

    private final AdminStatisticsService adminStatisticsService;

    @GetMapping("/overview")
    public AdminOverviewStatisticsResponse getOverview() {
        return adminStatisticsService.getOverview();
    }

    @GetMapping("/growth")
    public GrowthStatisticsResponse getGrowth(
            @RequestParam StatisticMetric metric,
            @RequestParam(defaultValue = "SEVEN_DAYS") StatisticPeriod period) {
        return adminStatisticsService.getGrowth(metric, period);
    }

    @GetMapping("/top-posts")
    public List<TopPostStatisticsResponse> getTopPosts(
            @RequestParam(defaultValue = "SEVEN_DAYS") StatisticPeriod period,
            @RequestParam(defaultValue = "10") int limit) {
        return adminStatisticsService.getTopPosts(period, limit);
    }

    @GetMapping("/active-users")
    public List<ActiveUserStatisticsResponse> getActiveUsers(
            @RequestParam(defaultValue = "SEVEN_DAYS") StatisticPeriod period,
            @RequestParam(defaultValue = "10") int limit) {
        return adminStatisticsService.getActiveUsers(period, limit);
    }

    @GetMapping("/reports")
    public ReportStatisticsResponse getReports() {
        return adminStatisticsService.getReportStatistics();
    }

    @GetMapping("/stories")
    public StoryStatisticsResponse getStories() {
        return adminStatisticsService.getStoryStatistics();
    }

    @GetMapping("/chat")
    public ChatStatisticsResponse getChat() {
        return adminStatisticsService.getChatStatistics();
    }
}

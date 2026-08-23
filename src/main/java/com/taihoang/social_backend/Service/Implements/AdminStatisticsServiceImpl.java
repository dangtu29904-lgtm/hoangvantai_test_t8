package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Conversations;
import com.taihoang.social_backend.Entity.ReportReason;
import com.taihoang.social_backend.Entity.ReportStatus;
import com.taihoang.social_backend.Entity.ReportTargetType;
import com.taihoang.social_backend.Entity.UserStatus;
import com.taihoang.social_backend.Repository.*;
import com.taihoang.social_backend.Service.AdminStatisticsService;
import com.taihoang.social_backend.dto.statistics.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminStatisticsServiceImpl implements AdminStatisticsService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final MessengerRepository messengerRepository;
    private final ConversationRepository conversationRepository;
    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final StoryReactionRepository storyReactionRepository;
    private final ReportRepository reportRepository;

    @Override
    @Transactional(readOnly = true)
    public AdminOverviewStatisticsResponse getOverview() {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();

        // Users
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus(UserStatus.ACTIVE);
        long suspendedUsers = userRepository.countByStatus(UserStatus.SUSPENDED);
        long newUsersToday = userRepository.countByCreatedAtBetween(today, today.plusDays(1));

        UserOverviewStatisticsResponse userStats = new UserOverviewStatisticsResponse(
                totalUsers, activeUsers, suspendedUsers, newUsersToday
        );

        // Posts
        long totalPosts = postRepository.count();
        long activePosts = postRepository.countByDeleted(false);
        long deletedPosts = postRepository.countByDeleted(true);
        long newPostsToday = postRepository.countByCreatedAtBetween(startOfToday, startOfTomorrow);

        PostOverviewStatisticsResponse postStats = new PostOverviewStatisticsResponse(
                totalPosts, activePosts, deletedPosts, newPostsToday
        );

        // Comments
        long totalComments = postCommentRepository.count();
        long newCommentsToday = postCommentRepository.countByCreatedAtBetween(startOfToday, startOfTomorrow);

        CommentOverviewStatisticsResponse commentStats = new CommentOverviewStatisticsResponse(
                totalComments, newCommentsToday
        );

        // Messages
        long totalMessages = messengerRepository.count();
        long messagesToday = messengerRepository.countBySentAtBetween(startOfToday, startOfTomorrow);

        MessageOverviewStatisticsResponse messageStats = new MessageOverviewStatisticsResponse(
                totalMessages, messagesToday
        );

        // Stories
        long totalStories = storyRepository.count();
        long activeStoriesNow = storyRepository.countActiveStories(now);
        long createdStoriesToday = storyRepository.countByCreatedAtBetween(startOfToday, startOfTomorrow);

        StoryOverviewStatisticsResponse storyStats = new StoryOverviewStatisticsResponse(
                totalStories, activeStoriesNow, createdStoriesToday
        );

        // Reports
        long pendingReports = reportRepository.countByStatus(ReportStatus.PENDING);
        long reviewingReports = reportRepository.countByStatus(ReportStatus.REVIEWING);
        long resolvedReports = reportRepository.countByStatus(ReportStatus.RESOLVED);
        long rejectedReports = reportRepository.countByStatus(ReportStatus.REJECTED);

        ReportOverviewStatisticsResponse reportStats = new ReportOverviewStatisticsResponse(
                pendingReports, reviewingReports, resolvedReports, rejectedReports
        );

        return new AdminOverviewStatisticsResponse(
                userStats, postStats, commentStats, messageStats, storyStats, reportStats
        );
    }

    @Override
    @Transactional(readOnly = true)
    public GrowthStatisticsResponse getGrowth(StatisticMetric metric, StatisticPeriod period) {
        LocalDate today = LocalDate.now();
        // Period includes today. E.g. 7D means today + 6 previous days.
        LocalDate fromDate = today.minusDays(period.getDays() - 1);
        LocalDate toDate = today.plusDays(1); // half-open interval

        LocalDateTime fromDateTime = fromDate.atStartOfDay();
        LocalDateTime toDateTime = toDate.atStartOfDay();

        List<DailyCountProjection> dbCounts;
        long total = 0;

        switch (metric) {
            case USERS:
                dbCounts = userRepository.countDailyGrowth(fromDate, toDate);
                total = userRepository.countByCreatedAtBetween(fromDate, toDate);
                break;
            case POSTS:
                dbCounts = postRepository.countDailyGrowth(fromDateTime, toDateTime);
                total = postRepository.countByCreatedAtBetween(fromDateTime, toDateTime);
                break;
            case COMMENTS:
                dbCounts = postCommentRepository.countDailyGrowth(fromDateTime, toDateTime);
                total = postCommentRepository.countByCreatedAtBetween(fromDateTime, toDateTime);
                break;
            case MESSAGES:
                dbCounts = messengerRepository.countDailyGrowth(fromDateTime, toDateTime);
                total = messengerRepository.countBySentAtBetween(fromDateTime, toDateTime);
                break;
            case STORIES:
                dbCounts = storyRepository.countDailyGrowth(fromDateTime, toDateTime);
                total = storyRepository.countByCreatedAtBetween(fromDateTime, toDateTime);
                break;
            case REPORTS:
                dbCounts = reportRepository.countDailyGrowth(fromDateTime, toDateTime);
                total = reportRepository.countByCreatedAtBetween(fromDateTime, toDateTime);
                break;
            default:
                throw new IllegalArgumentException("Unsupported metric: " + metric);
        }

        Map<LocalDate, Long> countMap = dbCounts.stream()
                .collect(Collectors.toMap(
                        DailyCountProjection::getDate,
                        DailyCountProjection::getCount
                ));

        List<DailyStatisticResponse> items = new ArrayList<>();
        for (int i = 0; i < period.getDays(); i++) {
            LocalDate d = fromDate.plusDays(i);
            long count = countMap.getOrDefault(d, 0L);
            items.add(new DailyStatisticResponse(d, count));
        }

        return new GrowthStatisticsResponse(metric, period.name(), fromDate, today, total, items);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TopPostStatisticsResponse> getTopPosts(StatisticPeriod period, int limit) {
        if (limit < 1 || limit > 100) limit = 10;
        
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(period.getDays() - 1);
        LocalDateTime fromDateTime = fromDate.atStartOfDay();
        LocalDateTime toDateTime = today.plusDays(1).atStartOfDay();

        List<TopPostProjection> topPosts = postRepository.findTopPostsInPeriod(fromDateTime, toDateTime);

        List<TopPostStatisticsResponse> responses = topPosts.stream().map(p -> {
            long reactionCount = p.getReactionCount() != null ? p.getReactionCount() : 0;
            long commentCount = p.getCommentCount() != null ? p.getCommentCount() : 0;
            long shareCount = p.getShareCount() != null ? p.getShareCount() : 0;
            
            long score = reactionCount * 1 + commentCount * 2 + shareCount * 3;
            
            String preview = p.getContent() != null ? p.getContent() : "";
            if (preview.length() > 100) {
                preview = preview.substring(0, 100) + "...";
            }
            
            return new TopPostStatisticsResponse(
                    p.getPostId(), p.getAuthorId(), p.getAuthorName(), preview,
                    reactionCount, commentCount, shareCount, score,
                    p.getCreatedAt(), p.getDeleted() != null ? p.getDeleted() : false
            );
        }).sorted(Comparator.comparing(TopPostStatisticsResponse::engagementScore).reversed())
          .limit(limit)
          .collect(Collectors.toList());

        return responses;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ActiveUserStatisticsResponse> getActiveUsers(StatisticPeriod period, int limit) {
        if (limit < 1 || limit > 100) limit = 10;

        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(period.getDays() - 1);
        LocalDateTime fromDateTime = fromDate.atStartOfDay();
        LocalDateTime toDateTime = today.plusDays(1).atStartOfDay();

        List<UserActivityCountProjection> postCounts = postRepository.countActiveUserPosts(fromDateTime, toDateTime);
        List<UserActivityCountProjection> commentCounts = postCommentRepository.countActiveUserComments(fromDateTime, toDateTime);
        List<UserActivityCountProjection> messageCounts = messengerRepository.countActiveUserMessages(fromDateTime, toDateTime);
        List<UserActivityCountProjection> storyCounts = storyRepository.countActiveUserStories(fromDateTime, toDateTime);

        Map<Long, ActiveUserTemp> userMap = new HashMap<>();

        for (UserActivityCountProjection p : postCounts) {
            userMap.computeIfAbsent(p.getUserId(), k -> new ActiveUserTemp()).posts = p.getCount();
        }
        for (UserActivityCountProjection c : commentCounts) {
            userMap.computeIfAbsent(c.getUserId(), k -> new ActiveUserTemp()).comments = c.getCount();
        }
        for (UserActivityCountProjection m : messageCounts) {
            userMap.computeIfAbsent(m.getUserId(), k -> new ActiveUserTemp()).messages = m.getCount();
        }
        for (UserActivityCountProjection s : storyCounts) {
            userMap.computeIfAbsent(s.getUserId(), k -> new ActiveUserTemp()).stories = s.getCount();
        }

        for (Map.Entry<Long, ActiveUserTemp> entry : userMap.entrySet()) {
            ActiveUserTemp t = entry.getValue();
            t.score = t.posts * 3 + t.comments * 2 + t.messages * 1 + t.stories * 2;
        }

        List<Map.Entry<Long, ActiveUserTemp>> topEntries = userMap.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue().score, a.getValue().score))
                .limit(limit)
                .toList();

        List<ActiveUserStatisticsResponse> result = new ArrayList<>();
        for (Map.Entry<Long, ActiveUserTemp> entry : topEntries) {
            userRepository.findById(entry.getKey()).ifPresent(user -> {
                ActiveUserTemp t = entry.getValue();
                result.add(new ActiveUserStatisticsResponse(
                        user.getId(), user.getUserName(), user.getAvatarUrl(),
                        t.posts, t.comments, t.messages, t.stories, t.score
                ));
            });
        }
        
        result.sort(Comparator.comparing(ActiveUserStatisticsResponse::activityScore).reversed());
        return result;
    }

    private static class ActiveUserTemp {
        long posts = 0;
        long comments = 0;
        long messages = 0;
        long stories = 0;
        long score = 0;
    }

    @Override
    @Transactional(readOnly = true)
    public ReportStatisticsResponse getReportStatistics() {
        long total = reportRepository.count();

        Map<ReportStatus, Long> byStatusMap = new EnumMap<>(ReportStatus.class);
        for (StringCountProjection p : reportRepository.countByStatusGrouped()) {
            byStatusMap.put(ReportStatus.valueOf(p.getKey()), p.getCount());
        }

        Map<ReportTargetType, Long> byTargetTypeMap = new EnumMap<>(ReportTargetType.class);
        for (StringCountProjection p : reportRepository.countByTargetTypeGrouped()) {
            byTargetTypeMap.put(ReportTargetType.valueOf(p.getKey()), p.getCount());
        }

        Map<ReportReason, Long> byReasonMap = new EnumMap<>(ReportReason.class);
        for (StringCountProjection p : reportRepository.countByReasonGrouped()) {
            byReasonMap.put(ReportReason.valueOf(p.getKey()), p.getCount());
        }

        return new ReportStatisticsResponse(total, byStatusMap, byTargetTypeMap, byReasonMap);
    }

    @Override
    @Transactional(readOnly = true)
    public StoryStatisticsResponse getStoryStatistics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();

        long totalStories = storyRepository.count();
        long activeNow = storyRepository.countActiveStories(now);
        long expired = storyRepository.countExpiredStories(now);
        long deleted = storyRepository.countByDeleted(true);
        long createdToday = storyRepository.countByCreatedAtBetween(startOfToday, startOfTomorrow);
        long totalViews = storyViewRepository.count();
        long totalReactions = storyReactionRepository.count();

        return new StoryStatisticsResponse(
                totalStories, activeNow, expired, deleted, createdToday, totalViews, totalReactions
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ChatStatisticsResponse getChatStatistics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = now.toLocalDate();
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();
        
        LocalDate sevenDaysAgo = today.minusDays(6);
        LocalDateTime startOf7Days = sevenDaysAgo.atStartOfDay();

        long totalConversations = conversationRepository.count();
        long directConversations = conversationRepository.countByType(Conversations.type_chat.private_chat);
        long groupConversations = conversationRepository.countByType(Conversations.type_chat.groups_chat);

        long totalMessages = messengerRepository.count();
        long messagesToday = messengerRepository.countBySentAtBetween(startOfToday, startOfTomorrow);
        long messagesLast7Days = messengerRepository.countBySentAtBetween(startOf7Days, startOfTomorrow);

        return new ChatStatisticsResponse(
                totalConversations, directConversations, groupConversations,
                totalMessages, messagesToday, messagesLast7Days
        );
    }
}

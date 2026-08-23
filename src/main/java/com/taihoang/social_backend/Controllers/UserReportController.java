package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.ReportService;
import com.taihoang.social_backend.dto.CreateReportRequest;
import com.taihoang.social_backend.dto.ReportListResponse;
import com.taihoang.social_backend.dto.ReportResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/reports")
@RequiredArgsConstructor
public class UserReportController {

    private final ReportService reportService;

    /**
     * POST /user/reports/posts/{postId}
     * Báo cáo một bài viết.
     */
    @PostMapping("/posts/{postId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse reportPost(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long postId,
            @Valid @RequestBody CreateReportRequest request
    ) {
        requireAuth(currentUser);
        return reportService.reportPost(currentUser.getId(), postId, request);
    }

    /**
     * POST /user/reports/comments/{commentId}
     * Báo cáo một bình luận.
     */
    @PostMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse reportComment(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long commentId,
            @Valid @RequestBody CreateReportRequest request
    ) {
        requireAuth(currentUser);
        return reportService.reportComment(currentUser.getId(), commentId, request);
    }

    /**
     * POST /user/reports/users/{userId}
     * Báo cáo một người dùng.
     */
    @PostMapping("/users/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    public ReportResponse reportUser(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @PathVariable Long userId,
            @Valid @RequestBody CreateReportRequest request
    ) {
        requireAuth(currentUser);
        return reportService.reportUser(currentUser.getId(), userId, request);
    }

    /**
     * GET /user/reports?page=0&limit=20
     * Xem danh sách report của chính mình.
     */
    @GetMapping
    public ReportListResponse getMyReports(
            @AuthenticationPrincipal AuthenticatedUserDetails currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        requireAuth(currentUser);
        return reportService.getMyReports(currentUser.getId(), page, limit);
    }

    private void requireAuth(AuthenticatedUserDetails currentUser) {
        if (currentUser == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chua dang nhap");
        }
    }
}

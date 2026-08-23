package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Entity.ReportReason;
import com.taihoang.social_backend.Entity.ReportStatus;
import com.taihoang.social_backend.Entity.ReportTargetType;
import com.taihoang.social_backend.Service.AdminReportService;
import com.taihoang.social_backend.dto.ReportListResponse;
import com.taihoang.social_backend.dto.ReportResolutionRequest;
import com.taihoang.social_backend.dto.ReportResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;

    /**
     * GET /admin/reports?status=PENDING&targetType=POST&reason=SPAM&page=0&limit=20
     */
    @GetMapping
    public ReportListResponse getReports(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportTargetType targetType,
            @RequestParam(required = false) ReportReason reason,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        requireAdmin(currentAdmin);
        return adminReportService.getReports(status, targetType, reason, page, limit);
    }

    /**
     * GET /admin/reports/{reportId}
     */
    @GetMapping("/{reportId}")
    public ReportResponse getReport(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long reportId
    ) {
        requireAdmin(currentAdmin);
        return adminReportService.getReport(reportId);
    }

    /**
     * PATCH /admin/reports/{reportId}/review
     * Chuyển PENDING → REVIEWING
     */
    @PatchMapping("/{reportId}/review")
    public ReportResponse markReviewing(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long reportId
    ) {
        requireAdmin(currentAdmin);
        return adminReportService.markReviewing(reportId, currentAdmin.getId());
    }

    /**
     * PATCH /admin/reports/{reportId}/resolve
     * Chuyển sang RESOLVED
     */
    @PatchMapping("/{reportId}/resolve")
    public ReportResponse resolve(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long reportId,
            @Valid @RequestBody(required = false) ReportResolutionRequest request
    ) {
        requireAdmin(currentAdmin);
        return adminReportService.resolve(reportId, currentAdmin.getId(), request);
    }

    /**
     * PATCH /admin/reports/{reportId}/reject
     * Chuyển sang REJECTED
     */
    @PatchMapping("/{reportId}/reject")
    public ReportResponse reject(
            @AuthenticationPrincipal AuthenticatedUserDetails currentAdmin,
            @PathVariable Long reportId,
            @Valid @RequestBody(required = false) ReportResolutionRequest request
    ) {
        requireAdmin(currentAdmin);
        return adminReportService.reject(reportId, currentAdmin.getId(), request);
    }

    private void requireAdmin(AuthenticatedUserDetails currentAdmin) {
        if (currentAdmin == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Chua dang nhap");
        }
    }
}

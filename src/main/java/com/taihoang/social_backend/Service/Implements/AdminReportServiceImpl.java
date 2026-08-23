package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.ReportRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.AdminReportService;
import com.taihoang.social_backend.dto.ReportListResponse;
import com.taihoang.social_backend.dto.ReportResolutionRequest;
import com.taihoang.social_backend.dto.ReportResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminReportServiceImpl implements AdminReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public ReportListResponse getReports(
            ReportStatus status,
            ReportTargetType targetType,
            ReportReason reason,
            int page,
            int limit
    ) {
        validatePage(page, limit);

        Page<Report> resultPage = reportRepository.findByFilters(
                status, targetType, reason,
                PageRequest.of(page, limit)
        );

        return new ReportListResponse(
                resultPage.getContent().stream().map(ReportResponse::from).toList(),
                page,
                limit,
                resultPage.getTotalElements(),
                resultPage.getTotalPages()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ReportResponse getReport(Long reportId) {
        Report report = loadReport(reportId);
        return ReportResponse.from(report);
    }

    @Override
    @Transactional
    public ReportResponse markReviewing(Long reportId, Long adminId) {
        Report report = loadReport(reportId);
        User admin = loadUser(adminId);

        ReportStatus current = report.getStatus();

        // Idempotent: already reviewing by same admin
        if (current == ReportStatus.REVIEWING) {
            return ReportResponse.from(report);
        }

        if (current == ReportStatus.RESOLVED || current == ReportStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Khong the chuyen sang REVIEWING tu trang thai: " + current);
        }

        // PENDING -> REVIEWING
        report.setStatus(ReportStatus.REVIEWING);
        report.setReviewedBy(admin);
        report.setReviewedAt(LocalDateTime.now());

        return ReportResponse.from(reportRepository.save(report));
    }

    @Override
    @Transactional
    public ReportResponse resolve(Long reportId, Long adminId, ReportResolutionRequest request) {
        Report report = loadReport(reportId);
        User admin = loadUser(adminId);

        ReportStatus current = report.getStatus();

        // Idempotent: already resolved
        if (current == ReportStatus.RESOLVED) {
            return ReportResponse.from(report);
        }

        if (current == ReportStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Khong the RESOLVE report da bi REJECTED");
        }

        report.setStatus(ReportStatus.RESOLVED);
        report.setReviewedBy(admin);
        report.setReviewedAt(LocalDateTime.now());
        report.setResolutionNote(request != null ? request.resolutionNote() : null);

        return ReportResponse.from(reportRepository.save(report));
    }

    @Override
    @Transactional
    public ReportResponse reject(Long reportId, Long adminId, ReportResolutionRequest request) {
        Report report = loadReport(reportId);
        User admin = loadUser(adminId);

        ReportStatus current = report.getStatus();

        // Idempotent: already rejected
        if (current == ReportStatus.REJECTED) {
            return ReportResponse.from(report);
        }

        if (current == ReportStatus.RESOLVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Khong the REJECT report da RESOLVED");
        }

        report.setStatus(ReportStatus.REJECTED);
        report.setReviewedBy(admin);
        report.setReviewedAt(LocalDateTime.now());
        report.setResolutionNote(request != null ? request.resolutionNote() : null);

        return ReportResponse.from(reportRepository.save(report));
    }

    // ===== Helpers =====

    private Report loadReport(Long reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay report"));
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Admin khong hop le"));
    }

    private void validatePage(int page, int limit) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page khong hop le");
        if (limit < 1 || limit > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit phai tu 1 den 100");
    }
}

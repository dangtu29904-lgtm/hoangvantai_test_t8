package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.*;
import com.taihoang.social_backend.Service.PostAccessService;
import com.taihoang.social_backend.Service.ReportService;
import com.taihoang.social_backend.dto.CreateReportRequest;
import com.taihoang.social_backend.dto.ReportListResponse;
import com.taihoang.social_backend.dto.ReportResponse;
import com.taihoang.social_backend.exception.PostAccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostAccessService postAccessService;

    @Override
    @Transactional
    public ReportResponse reportPost(
            Long currentUserId,
            Long postId,
            CreateReportRequest request
    ) {
        User reporter = loadUser(currentUserId);

        Post post = postRepository.findActiveById(postId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Khong tim thay bai viet"));

        // Check view permission (respects privacy)
        try {
            postAccessService.validateCanView(currentUserId, post);
        } catch (PostAccessDeniedException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban khong co quyen bao cao bai viet nay");
        }

        // Cannot report own content
        if (post.getAuthor().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ban khong the bao cao bai viet cua chinh minh");
        }

        String description = normalizeDescription(request.reason(), request.description());

        return findOrCreateReport(reporter, ReportTargetType.POST, postId, request.reason(), description);
    }

    @Override
    @Transactional
    public ReportResponse reportComment(
            Long currentUserId,
            Long commentId,
            CreateReportRequest request
    ) {
        User reporter = loadUser(currentUserId);

        PostComment comment = postCommentRepository.findActiveById(commentId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Khong tim thay binh luan"));

        Post post = comment.getPost();
        if (post.isDeleted()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bai viet khong con ton tai");
        }

        try {
            postAccessService.validateCanView(currentUserId, post);
        } catch (PostAccessDeniedException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban khong co quyen bao cao binh luan nay");
        }

        // Cannot report own content
        if (comment.getAuthor().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ban khong the bao cao binh luan cua chinh minh");
        }

        String description = normalizeDescription(request.reason(), request.description());

        return findOrCreateReport(reporter, ReportTargetType.COMMENT, commentId, request.reason(), description);
    }

    @Override
    @Transactional
    public ReportResponse reportUser(
            Long currentUserId,
            Long targetUserId,
            CreateReportRequest request
    ) {
        User reporter = loadUser(currentUserId);

        // Cannot report yourself
        if (currentUserId.equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ban khong the bao cao chinh minh");
        }

        // Target user must exist
        userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Khong tim thay nguoi dung"));

        String description = normalizeDescription(request.reason(), request.description());

        return findOrCreateReport(reporter, ReportTargetType.USER, targetUserId, request.reason(), description);
    }

    @Override
    @Transactional(readOnly = true)
    public ReportListResponse getMyReports(Long currentUserId, int page, int limit) {
        validatePage(page, limit);

        Page<Report> resultPage = reportRepository.findByReporter_IdOrderByCreatedAtDescIdDesc(
                currentUserId,
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

    // ===== Private helpers =====

    private ReportResponse findOrCreateReport(
            User reporter,
            ReportTargetType targetType,
            Long targetId,
            ReportReason reason,
            String description
    ) {
        // Idempotent: return existing if already reported
        return reportRepository
                .findByReporter_IdAndTargetTypeAndTargetId(reporter.getId(), targetType, targetId)
                .map(ReportResponse::from)
                .orElseGet(() -> {
                    Report report = new Report();
                    report.setReporter(reporter);
                    report.setTargetType(targetType);
                    report.setTargetId(targetId);
                    report.setReason(reason);
                    report.setDescription(description);
                    report.setStatus(ReportStatus.PENDING);
                    return ReportResponse.from(reportRepository.save(report));
                });
    }

    private String normalizeDescription(ReportReason reason, String description) {
        if (description == null || description.isBlank()) {
            if (reason == ReportReason.OTHER) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Ly do 'OTHER' can mo ta cu the");
            }
            return null;
        }
        return description.trim();
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User khong hop le"));
    }

    private void validatePage(int page, int limit) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page khong hop le");
        if (limit < 1 || limit > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit phai tu 1 den 100");
    }
}

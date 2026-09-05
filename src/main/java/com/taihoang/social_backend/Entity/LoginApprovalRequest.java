package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "login_approval_request",
        indexes = {
                @Index(name = "idx_login_approval_user_status", columnList = "user_id, status"),
                @Index(name = "idx_login_approval_expires", columnList = "expires_at")
        },
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_login_approval_token", columnNames = "approval_token")
        }
)
@Getter
@Setter
public class LoginApprovalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_device_id")
    private UserDevice userDevice;

    @Column(name = "approval_token", nullable = false, length = 96)
    private String approvalToken;

    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;

    @Column(name = "otp_hash", length = 128)
    private String otpHash;

    @Column(name = "otp_sent_at")
    private LocalDateTime otpSentAt;

    @Column(name = "otp_verified_at")
    private LocalDateTime otpVerifiedAt;

    @Column(name = "otp_attempts", nullable = false, columnDefinition = "int default 0")
    private int otpAttempts = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by_user_id")
    private User decidedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private Status status = Status.PENDING;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (status == null) {
            status = Status.PENDING;
        }
    }

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED,
        EXPIRED,
        CONSUMED
    }
}

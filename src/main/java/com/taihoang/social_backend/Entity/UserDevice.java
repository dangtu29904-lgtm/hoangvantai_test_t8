package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(
        name = "user_device",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_device_user_device_id",
                        columnNames = {"user_id", "device_id"}
                )
        },
        indexes = {
                @Index(
                        name = "idx_user_device_user_last_seen",
                        columnList = "user_id, last_seen_at"
                )
        }
)
@Getter
@Setter
public class UserDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "device_id", nullable = false, length = 128)
    private String deviceId;

    @Column(name = "device_name", length = 160)
    private String deviceName;

    @Column(name = "device_type", length = 40)
    private String deviceType;

    @Column(name = "browser", length = 80)
    private String browser;

    @Column(name = "os", length = 80)
    private String os;

    @Column(name = "first_seen_at", nullable = false)
    private LocalDateTime firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;

    @Column(name = "last_ip", length = 45)
    private String lastIp;

    @Column(name = "user_agent", length = 1000)
    private String userAgent;

    @Column(name = "trusted", nullable = false)
    private boolean trusted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "userDevice")
    private List<UserSession> userSessions;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (firstSeenAt == null) {
            firstSeenAt = now;
        }
        if (lastSeenAt == null) {
            lastSeenAt = now;
        }
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

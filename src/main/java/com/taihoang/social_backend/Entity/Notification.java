package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notification",
        indexes = {
                @Index(
                        name = "idx_notification_receiver_created",
                        columnList = "receiver_id, created_at"
                )
        }
)
@Getter
@Setter
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Người nhận thông báo
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "receiver_id",
            nullable = false
    )
    private User receiver;

    // Người gây ra hành động
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "actor_id",
            nullable = false
    )
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "type",
            nullable = false,
            columnDefinition = "varchar(30)"
    )
    private NotificationType type;

    /*
     * ID của đối tượng liên quan.
     *
     * Ví dụ:
     * FRIEND_REQUEST
     * referenceId = friendship.id
     */
    @Column(name = "reference_id")
    private Long referenceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "comment_id")
    private PostComment comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id")
    private Story story;

    @Column(
            name = "is_read",
            nullable = false
    )
    private boolean read = false;

    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    public void prePersist() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public enum NotificationType {

        FRIEND_REQUEST,

        FRIEND_ACCEPTED,

        POST_LIKE,

        POST_COMMENT,

        NEW_MESSAGE,
        
        POST_REACTION,
        
        COMMENT_REPLY,
        
        POST_SHARE,
        
        POST_MENTION,
        
        STORY_REACTION
    }
}

package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_comments",
        indexes = {
                @Index(
                        name = "idx_comments_post_deleted_created",
                        columnList = "post_id, deleted, created_at"
                ),
                @Index(
                        name = "idx_comments_parent_deleted_created",
                        columnList = "parent_comment_id, deleted, created_at"
                )
        }
)
@Getter
@Setter
public class PostComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "post_id",
            nullable = false
    )
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "author_id",
            nullable = false
    )
    private User author;

    @Column(
            name = "content",
            nullable = false,
            length = 2000
    )
    private String content;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ===== SOFT DELETE =====

    @Column(
            name = "deleted",
            nullable = false
    )
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "delete_type")
    private CommentDeleteType deleteType;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private PostComment parentComment;
    @PrePersist
    public void prePersist() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void softDelete(
            User deletedBy,
            CommentDeleteType deleteType
    ) {

        if (deleted) {
            return;
        }

        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
        this.deletedBy = deletedBy;
        this.deleteType = deleteType;
    }
}
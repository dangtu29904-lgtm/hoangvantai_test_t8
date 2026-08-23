package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "posts",
        indexes = {

                @Index(
                        name = "idx_posts_author_created_at",
                        columnList = "author_id, created_at"
                ),

                @Index(
                        name = "idx_posts_shared_post",
                        columnList = "shared_post_id"
                )
        }
)
@Getter
@Setter
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(
            name = "content",
            length = 5000
    )
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "privacy",
            nullable = false,
            length = 20
    )
    private PostPrivacy privacy = PostPrivacy.PUBLIC;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    @Column(name = "deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shared_post_id")
    private Post sharedPost;

    @PrePersist
    public void prePersist() {

        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (privacy == null) {
            privacy = PostPrivacy.PUBLIC;
        }
    }
    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
    public void softDelete(User deletedBy) {

        if (deleted) {
            return;
        }

        this.deleted = true;
        this.deletedAt = LocalDateTime.now();
        this.deletedBy = deletedBy;
    }
    public void restore() {

        this.deleted = false;
        this.deletedAt = null;
        this.deletedBy = null;
    }

}
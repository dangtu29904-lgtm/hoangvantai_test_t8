package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "saved_post",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_saved_post_user_post",
                        columnNames = {
                                "user_id",
                                "post_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_saved_post_user_created",
                        columnList = "user_id, saved_at"
                )
        }
)
@Getter
@Setter
public class SavedPost {

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Long id;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "user_id",
            nullable = false
    )
    private User user;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "post_id",
            nullable = false
    )
    private Post post;

    @Column(
            name = "saved_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime savedAt;

    @PrePersist
    public void prePersist() {

        if (savedAt == null) {
            savedAt = LocalDateTime.now();
        }
    }
}
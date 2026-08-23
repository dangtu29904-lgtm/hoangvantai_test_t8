package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "post_mention",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_post_mention_post_user",
                        columnNames = {
                                "post_id",
                                "mentioned_user_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_post_mention_post",
                        columnList = "post_id"
                ),
                @Index(
                        name = "idx_post_mention_user",
                        columnList = "mentioned_user_id"
                )
        }
)
@Getter
@Setter
public class PostMention {

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
            name = "post_id",
            nullable = false
    )
    private Post post;

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "mentioned_user_id",
            nullable = false
    )
    private User mentionedUser;

    @Column(
            name = "sort_order",
            nullable = false
    )
    private Integer sortOrder;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (sortOrder == null) {
            sortOrder = 0;
        }
    }
}

package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "hidden_post",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_hidden_post_user_post",
                        columnNames = {
                                "user_id",
                                "post_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_hidden_post_user",
                        columnList = "user_id"
                )
        }
)
@Getter
@Setter
public class HiddenPost {

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
            name = "hidden_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime hiddenAt;

    @PrePersist
    public void prePersist() {

        if (hiddenAt == null) {
            hiddenAt = LocalDateTime.now();
        }
    }
}

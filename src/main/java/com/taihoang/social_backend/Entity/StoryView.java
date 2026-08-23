package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "story_view",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_story_view_story_user",
                        columnNames = {
                                "story_id",
                                "viewer_id"
                        }
                )
        },
        indexes = {
                @Index(
                        name = "idx_story_view_story",
                        columnList = "story_id"
                ),
                @Index(
                        name = "idx_story_view_viewer",
                        columnList = "viewer_id"
                )
        }
)
@Getter
@Setter
public class StoryView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viewer_id", nullable = false)
    private User viewer;

    @Column(name = "viewed_at", nullable = false, updatable = false)
    private LocalDateTime viewedAt;

    @PrePersist
    public void prePersist() {
        if (viewedAt == null) {
            viewedAt = LocalDateTime.now();
        }
    }
}

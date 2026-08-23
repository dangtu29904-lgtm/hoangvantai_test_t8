package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "stories",
        indexes = {
                @Index(
                        name = "idx_story_author_created",
                        columnList = "author_id, created_at"
                ),
                @Index(
                        name = "idx_story_expires",
                        columnList = "expires_at"
                )
        }
)
@Getter
@Setter
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private StoryType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "privacy", nullable = false, length = 20)
    private StoryPrivacy privacy = StoryPrivacy.PUBLIC;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "upload_id")
    private ChatUpload mediaUpload;

    @Column(name = "text", length = 1000)
    private String text;

    @Column(name = "background_color")
    private String backgroundColor;

    @Column(name = "text_color")
    private String textColor;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    // Soft delete
    @Column(name = "deleted", nullable = false)
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deleted_by")
    private User deletedBy;

    // Music
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "music_track_id")
    private MusicTrack musicTrack;

    @Column(name = "music_start_ms")
    private Long musicStartMs;

    @Column(name = "music_duration_ms")
    private Long musicDurationMs;

    @Column(name = "music_volume")
    private Double musicVolume;

    @OneToMany(mappedBy = "story", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<StoryTextOverlay> textOverlays = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (expiresAt == null) {
            expiresAt = createdAt.plusHours(24);
        }
        if (privacy == null) {
            privacy = StoryPrivacy.PUBLIC;
        }
    }

    public void addTextOverlay(StoryTextOverlay overlay) {
        textOverlays.add(overlay);
        overlay.setStory(this);
    }
}

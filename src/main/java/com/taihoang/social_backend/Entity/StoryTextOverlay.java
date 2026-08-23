package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
        name = "story_text_overlay",
        indexes = {
                @Index(
                        name = "idx_story_text_story",
                        columnList = "story_id"
                )
        }
)
@Getter
@Setter
public class StoryTextOverlay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @Column(name = "text", nullable = false, length = 300)
    private String text;

    @Column(name = "x", nullable = false)
    private Double x;

    @Column(name = "y", nullable = false)
    private Double y;

    @Column(name = "font_size")
    private Double fontSize;

    @Column(name = "color")
    private String color;

    @Column(name = "font_style")
    private String fontStyle;

    @Column(name = "rotation")
    private Double rotation;

    @Column(name = "sort_order")
    private Integer sortOrder;
}

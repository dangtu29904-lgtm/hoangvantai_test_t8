package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "message_reactions",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_message_reaction_user_message",
                        columnNames = {
                                "message_id",
                                "user_id"
                        }
                )
        }
)
@Getter
@Setter
public class MessageReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "message_id",
            nullable = false
    )
    private Messenger messenger;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false
    )
    private User user;


    @Enumerated(EnumType.STRING)
    @Column(
            name = "type",
            nullable = false
    )
    private ReactionType type;


    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;


    @Column(name = "updated_at")
    private LocalDateTime updatedAt;


    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }


    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
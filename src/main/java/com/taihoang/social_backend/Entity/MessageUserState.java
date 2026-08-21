package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "message_user_state",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {
                        "message_id",
                        "user_id"
                }
        )
)
@Getter
@Setter
public class MessageUserState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "message_id",
            nullable = false
    )
    private Messenger messenger;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "user_id",
            nullable = false
    )
    private User user;


    @Column(
            name = "deleted_at",
            columnDefinition = "datetime(6)"
    )
    private LocalDateTime deletedAt;
}
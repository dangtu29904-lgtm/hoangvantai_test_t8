package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name="messenger_status",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "message_id"}),
        indexes = @Index(name = "idx_user_undelivered", columnList = "user_id, delivered_at"))
@Setter
@Getter
public class MessengerStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;
    @Column(name="delivered_at", columnDefinition = "datetime(6)")
    private LocalDateTime deliveredAt ;
    @Column(name="seen_at", columnDefinition = "datetime(6)")
    private LocalDateTime seenAt ;
    @ManyToOne
    @JoinColumn(name="user_id")
    private User user  ;
    @ManyToOne
    @JoinColumn(name="message_id")
    private Messenger messenger ;
}

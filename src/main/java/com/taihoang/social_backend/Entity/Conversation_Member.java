package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "conversation_member",
        uniqueConstraints = @UniqueConstraint(columnNames = {"conversation_id", "user_id"}))
@Setter
@Getter
public class Conversation_Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;
    @Column(name = "joined_at")
    private LocalDate joinAt ;
    @ManyToOne
    @JoinColumn(name="conversation_id")
    private Conversations conversation ;
    @ManyToOne
    @JoinColumn(name="user_id")
    private User user ;
}

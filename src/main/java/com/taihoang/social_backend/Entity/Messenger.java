package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name= "messenger",
        uniqueConstraints = @UniqueConstraint(columnNames = {"conversation_id", "client_messenge_id"}),
        indexes = @Index(name = "idx_conv_seq", columnList = "conversation_id, sequence_number"))
@Setter
@Getter
public class Messenger {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;
    @Column(name="content")
    private String content  ;
    @Column(name="client_messenge_id")
    private String clientMessengeId ;
    @Column(name="sequence_number")
    private Long sequenceNumber ;
    @Column(name="seen_at")
    private LocalDate seenAt ;
    @ManyToOne
    @JoinColumn(name="user_id")
    private User user ;
    @ManyToOne
    @JoinColumn(name="conversation_id")
    private Conversations conversation ;

    @OneToMany(mappedBy = "messenger")
    private List<MessengerStatus> messengerStatuses ;
}

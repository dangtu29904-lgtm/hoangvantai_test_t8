package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name="conversation")
@Getter
@Setter
public class Conversations {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;
    @Enumerated(EnumType.STRING)
    @Column(name="type" , nullable = false)
    private type_chat type ;
    @Column(name = "name", length = 100)
    private String name;
    @Column(name = "create_at")
    private LocalDate createAt ;

    @OneToMany(mappedBy = "conversation")
    private List<Conversation_Member> conversationMembers ;

    @OneToMany(mappedBy = "conversation")
    private List<Messenger> messengers ;

    public enum type_chat {
        private_chat , groups_chat
    }
}

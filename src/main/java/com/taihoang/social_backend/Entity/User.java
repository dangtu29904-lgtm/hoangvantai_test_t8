package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name="user")
@Getter
@Setter
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id ;
    @Column(name="username")
    private String userName ;
    @Column(name="email", unique = true)
    private String email ;
    @Column(name="password")
    private String password ;

    // ===== PROFILE =====

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "bio", length = 500)
    private String bio;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private Gender gender;


    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role = Role.USER ;
    @Column(name = "create_at")
    private LocalDate creatAt  ;

    @OneToMany(mappedBy = "user")
    private List<Conversation_Member> conversationMembers ;
    @OneToMany(mappedBy = "user")
    private List<Messenger> messengers ;
    @OneToMany(mappedBy = "user")
    private List<MessengerStatus> messengerStatuses ;
    @OneToMany(mappedBy = "user")
    private List<UserDevice> userDevices ;
    @OneToMany(mappedBy = "user")
    private List<UserSession> userSessions ;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private UserStatus status = UserStatus.ACTIVE;

    @PrePersist
    public void prePersist() {
        if (role == null) {
            role = Role.USER;
        }
        if (creatAt == null) {
            creatAt = LocalDate.now();
        }
        if (status == null) {
            status = UserStatus.ACTIVE;
        }
    }

    public enum Role {
        USER, ADMIN
    }
    public enum Gender {
        MALE,
        FEMALE,
        OTHER
    }
}

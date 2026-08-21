package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_upload")
@Getter
@Setter
public class ChatUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false
    )
    private User user;


    @Enumerated(EnumType.STRING)
    @Column(
            name = "attachment_type",
            nullable = false
    )
    private AttachmentType attachmentType;


    @Column(
            name = "public_id",
            nullable = false
    )
    private String publicId;


    @Column(
            name = "secure_url",
            nullable = false,
            length = 1000
    )
    private String secureUrl;


    @Column(name = "original_file_name")
    private String originalFileName;


    @Column(name = "content_type")
    private String contentType;


    @Column(name = "file_size")
    private Long fileSize;


    @Column(name = "created_at")
    private LocalDateTime createdAt;


    @Column(name = "used_at")
    private LocalDateTime usedAt;


    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
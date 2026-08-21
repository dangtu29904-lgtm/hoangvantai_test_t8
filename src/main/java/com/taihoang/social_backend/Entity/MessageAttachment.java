package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "message_attachment",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_message_attachment_upload",
                        columnNames = "chat_upload_id"
                )
        }
)
@Getter
@Setter
public class MessageAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "message_id",
            nullable = false
    )
    private Messenger messenger;


    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "chat_upload_id",
            nullable = false,
            unique = true
    )
    private ChatUpload chatUpload;


    @Column(
            name = "position",
            nullable = false
    )
    private Integer position;


    @Column(
            name = "created_at",
            nullable = false
    )
    private LocalDateTime createdAt;


    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
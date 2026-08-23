package com.taihoang.social_backend.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
        name = "post_media",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {
                                "post_id",
                                "upload_id"
                        }
                )
        }
)
@Getter
@Setter
public class PostMedia {

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Long id;


    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "post_id",
            nullable = false
    )
    private Post post;


    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "upload_id",
            nullable = false
    )
    private ChatUpload upload;


    @Column(
            name = "sort_order",
            nullable = false
    )
    private Integer sortOrder;
}
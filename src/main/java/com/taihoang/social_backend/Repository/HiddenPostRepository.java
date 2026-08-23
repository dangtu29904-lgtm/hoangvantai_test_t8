package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.HiddenPost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HiddenPostRepository
        extends JpaRepository<HiddenPost, Long> {

    Optional<HiddenPost> findByUser_IdAndPost_Id(
            Long userId,
            Long postId
    );

    boolean existsByUser_IdAndPost_Id(
            Long userId,
            Long postId
    );

    long deleteByUser_IdAndPost_Id(
            Long userId,
            Long postId
    );
}

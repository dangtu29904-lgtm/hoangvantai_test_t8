package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostMediaRepository
        extends JpaRepository<PostMedia, Long> {

    List<PostMedia>
    findByPost_IdOrderBySortOrderAsc(
            Long postId
    );
}
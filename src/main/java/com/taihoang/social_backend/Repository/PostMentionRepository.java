package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.PostMention;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostMentionRepository
        extends JpaRepository<PostMention, Long> {

    @EntityGraph(attributePaths = "mentionedUser")
    List<PostMention> findByPost_IdOrderBySortOrderAsc(
            Long postId
    );

    void deleteByPost_Id(
            Long postId
    );
}

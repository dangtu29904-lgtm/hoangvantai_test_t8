package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.PostReaction;
import com.taihoang.social_backend.dto.ReactionCountProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PostReactionRepository extends JpaRepository<PostReaction,Long> {
    Optional<PostReaction>
    findByPost_IdAndUser_Id(
            Long postId,
            Long userId
    );

    long countByPost_Id(Long postId);
    @EntityGraph(attributePaths = "user")
    Page<PostReaction> findByPost_Id(
            Long postId,
            Pageable pageable
    );
    @Query("""
    select r.type as type,
           count(r.id) as count
    from PostReaction r
    where r.post.id = :postId
    group by r.type
""")
    List<ReactionCountProjection> countReactionTypes(
            @Param("postId")
            Long postId
    );
}

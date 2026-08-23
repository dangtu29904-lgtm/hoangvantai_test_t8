package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PostCommentRepository
        extends JpaRepository<PostComment, Long> {
    @EntityGraph(attributePaths = "author")
    Page<PostComment>
    findByPost_IdAndDeletedFalseOrderByCreatedAtAscIdAsc(
            Long postId,
            Pageable pageable
    );
    @Query("""
    select c
    from PostComment c
    join fetch c.author
    join fetch c.post
    where c.id = :commentId
      and c.deleted = false
""")
    Optional<PostComment> findActiveById(
            @Param("commentId")
            Long commentId
    );
    long countByPost_IdAndDeletedFalse(
            Long postId
    );
}
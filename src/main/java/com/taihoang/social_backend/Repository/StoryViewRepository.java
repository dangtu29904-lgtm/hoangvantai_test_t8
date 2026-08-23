package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.StoryView;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StoryViewRepository extends JpaRepository<StoryView, Long> {

    boolean existsByStory_IdAndViewer_Id(Long storyId, Long viewerId);

    @Query("SELECT sv.story.id FROM StoryView sv WHERE sv.viewer.id = :viewerId AND sv.story.id IN :storyIds")
    List<Long> findSeenStoryIdsByViewerAndStoryIn(@Param("viewerId") Long viewerId, @Param("storyIds") Collection<Long> storyIds);

    @EntityGraph(attributePaths = {"viewer"})
    Page<StoryView> findByStory_IdOrderByViewedAtDesc(Long storyId, Pageable pageable);
    
    long countByStory_Id(Long storyId);
}

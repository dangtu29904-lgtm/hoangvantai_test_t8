package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.StoryReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface StoryReactionRepository extends JpaRepository<StoryReaction, Long> {

    Optional<StoryReaction> findByStory_IdAndUser_Id(Long storyId, Long userId);

    @Query("SELECT sr FROM StoryReaction sr WHERE sr.user.id = :userId AND sr.story.id IN :storyIds")
    List<StoryReaction> findByUser_IdAndStory_IdIn(@Param("userId") Long userId, @Param("storyIds") Collection<Long> storyIds);

    @Query("SELECT sr FROM StoryReaction sr WHERE sr.story.id = :storyId AND sr.user.id IN :userIds")
    List<StoryReaction> findByStory_IdAndUser_IdIn(
            @Param("storyId") Long storyId,
            @Param("userIds") Collection<Long> userIds
    );

    long countByStory_Id(Long storyId);

    @Modifying
    @Query("DELETE FROM StoryReaction sr WHERE sr.story.id = :storyId AND sr.user.id = :userId")
    void deleteByStory_IdAndUser_Id(@Param("storyId") Long storyId, @Param("userId") Long userId);
}

package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.MusicTrack;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MusicTrackRepository extends JpaRepository<MusicTrack, Long> {

    @Query("SELECT m FROM MusicTrack m WHERE m.active = true AND (LOWER(m.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(m.artist) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<MusicTrack> searchActiveTracks(@Param("query") String query, Pageable pageable);

    Page<MusicTrack> findByActiveTrue(Pageable pageable);
}

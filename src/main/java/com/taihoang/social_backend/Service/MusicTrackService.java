package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.MusicTrack;
import org.springframework.data.domain.Page;

public interface MusicTrackService {

    Page<MusicTrack> searchTracks(String query, int page, int limit);
    
    MusicTrack getTrack(Long trackId);
}

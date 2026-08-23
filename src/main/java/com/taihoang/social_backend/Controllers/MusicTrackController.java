package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Entity.MusicTrack;
import com.taihoang.social_backend.Service.MusicTrackService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user/music/tracks")
@RequiredArgsConstructor
public class MusicTrackController {

    private final MusicTrackService musicTrackService;

    @GetMapping
    public Page<MusicTrack> getTracks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return musicTrackService.searchTracks(null, page, limit);
    }

    @GetMapping("/search")
    public Page<MusicTrack> searchTracks(
            @RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return musicTrackService.searchTracks(q, page, limit);
    }

    @GetMapping("/{trackId}")
    public MusicTrack getTrack(@PathVariable Long trackId) {
        return musicTrackService.getTrack(trackId);
    }
}

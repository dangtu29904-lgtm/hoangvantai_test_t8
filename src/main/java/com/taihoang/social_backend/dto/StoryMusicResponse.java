package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.MusicTrack;
import com.taihoang.social_backend.Entity.Story;

public record StoryMusicResponse(
        Long id,
        String title,
        String artist,
        String audioUrl,
        String coverUrl,
        Long startMs,
        Long durationMs,
        Double volume
) {
    public static StoryMusicResponse from(Story story) {
        MusicTrack track = story.getMusicTrack();
        if (track == null) return null;
        
        return new StoryMusicResponse(
                track.getId(),
                track.getTitle(),
                track.getArtist(),
                track.getAudioUrl(),
                track.getCoverUrl(),
                story.getMusicStartMs(),
                story.getMusicDurationMs(),
                story.getMusicVolume()
        );
    }
}

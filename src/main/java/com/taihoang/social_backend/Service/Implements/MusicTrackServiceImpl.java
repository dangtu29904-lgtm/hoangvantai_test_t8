package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.MusicTrack;
import com.taihoang.social_backend.Repository.MusicTrackRepository;
import com.taihoang.social_backend.Service.MusicTrackService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class MusicTrackServiceImpl implements MusicTrackService {

    private final MusicTrackRepository musicTrackRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<MusicTrack> searchTracks(String query, int page, int limit) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page khong hop le");
        if (limit < 1 || limit > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit phai tu 1 den 100");

        if (query == null || query.trim().isEmpty()) {
            return musicTrackRepository.findByActiveTrue(PageRequest.of(page, limit));
        }

        return musicTrackRepository.searchActiveTracks(query.trim(), PageRequest.of(page, limit));
    }

    @Override
    @Transactional(readOnly = true)
    public MusicTrack getTrack(Long trackId) {
        MusicTrack track = musicTrackRepository.findById(trackId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ban nhac"));
                
        if (!track.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ban nhac khong con kha dung");
        }
        
        return track;
    }
}

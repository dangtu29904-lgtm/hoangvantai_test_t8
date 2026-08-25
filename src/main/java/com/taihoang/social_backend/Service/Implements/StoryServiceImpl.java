package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.*;
import com.taihoang.social_backend.Service.StoryAccessService;
import com.taihoang.social_backend.Service.StoryService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoryServiceImpl implements StoryService {

    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final StoryReactionRepository storyReactionRepository;
    private final UserRepository userRepository;
    private final ChatUploadRepository chatUploadRepository;
    private final MusicTrackRepository musicTrackRepository;
    private final StoryAccessService storyAccessService;

    @Override
    @Transactional
    public StoryResponse createStory(Long currentUserId, CreateStoryRequest request) {
        User author = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User khong hop le"));

        Story story = new Story();
        story.setAuthor(author);
        story.setType(request.type());
        story.setPrivacy(request.privacy() != null ? request.privacy() : StoryPrivacy.PUBLIC);
        story.setBackgroundColor(request.backgroundColor());
        story.setTextColor(request.textColor());

        // Handle Media
        if (request.type() == StoryType.IMAGE || request.type() == StoryType.VIDEO) {
            if (request.uploadId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thieu uploadId cho Image/Video Story");
            }
            ChatUpload upload = chatUploadRepository.findById(request.uploadId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay file upload"));
            if (!upload.getUser().getId().equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong the su dung file upload cua nguoi khac");
            }
            if (request.type() == StoryType.IMAGE && upload.getAttachmentType() != AttachmentType.IMAGE) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File upload khong phai la anh");
            }
            if (request.type() == StoryType.VIDEO && upload.getAttachmentType() != AttachmentType.VIDEO) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File upload khong phai la video");
            }
            if (upload.getUsedAt() == null) {
                upload.setUsedAt(LocalDateTime.now());
                chatUploadRepository.save(upload);
            }
            story.setMediaUpload(upload);
        }

        // Handle Text
        if (request.type() == StoryType.TEXT) {
            if (request.text() == null || request.text().trim().isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Text Story phai co noi dung text");
            }
        }
        story.setText(request.text());

        // Handle Overlays
        if (request.textOverlays() != null) {
            int order = 0;
            for (StoryTextOverlayRequest overlayReq : request.textOverlays()) {
                StoryTextOverlay overlay = new StoryTextOverlay();
                overlay.setText(overlayReq.text());
                overlay.setX(overlayReq.x());
                overlay.setY(overlayReq.y());
                overlay.setFontSize(overlayReq.fontSize());
                overlay.setColor(overlayReq.color());
                overlay.setFontStyle(overlayReq.fontStyle());
                overlay.setRotation(overlayReq.rotation());
                overlay.setSortOrder(order++);
                story.addTextOverlay(overlay);
            }
        }

        // Handle Music
        if (request.musicTrackId() != null) {
            MusicTrack track = musicTrackRepository.findById(request.musicTrackId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ban nhac"));
            if (!track.isActive()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ban nhac khong the su dung");
            }
            if (request.musicStartMs() == null || request.musicDurationMs() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thieu thoi gian bat dau/ket thuc cho ban nhac");
            }
            if (request.musicStartMs() < 0 || request.musicDurationMs() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thoi gian ban nhac khong hop le");
            }
            if (request.musicStartMs() + request.musicDurationMs() > track.getDurationMs()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thoi gian phat vuot qua do dai ban nhac");
            }
            Double volume = request.musicVolume() != null ? request.musicVolume() : 1.0;
            if (volume < 0.0 || volume > 1.0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Volume phai tu 0.0 den 1.0");
            }
            story.setMusicTrack(track);
            story.setMusicStartMs(request.musicStartMs());
            story.setMusicDurationMs(request.musicDurationMs());
            story.setMusicVolume(volume);
        }

        Story saved = storyRepository.save(story);
        return StoryResponse.from(saved, true, null, 0L);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryFeedUserResponse> getStoryFeed(Long currentUserId) {
        LocalDateTime now = LocalDateTime.now();
        List<Story> feedStories = storyRepository.findActiveFeedStories(currentUserId, now);

        if (feedStories.isEmpty()) {
            return List.of();
        }

        Set<Long> storyIds = feedStories.stream().map(Story::getId).collect(Collectors.toSet());

        // Bulk-load seen IDs
        Set<Long> seenIds = new HashSet<>(storyViewRepository.findSeenStoryIdsByViewerAndStoryIn(currentUserId, storyIds));

        // Bulk-load my reactions
        Map<Long, ReactionType> myReactionMap = buildMyReactionMap(currentUserId, storyIds);

        // Bulk-load reaction counts
        Map<Long, Long> reactionCounts = buildReactionCountMap(storyIds);

        // Group by author
        Map<Long, List<Story>> storiesByAuthor = new LinkedHashMap<>();
        for (Story story : feedStories) {
            storiesByAuthor.computeIfAbsent(story.getAuthor().getId(), k -> new ArrayList<>()).add(story);
        }

        List<StoryFeedUserResponse> feedResponse = new ArrayList<>();

        for (Map.Entry<Long, List<Story>> entry : storiesByAuthor.entrySet()) {
            List<Story> authorStories = entry.getValue();
            boolean hasUnseen = false;
            List<StoryResponse> storyResponses = new ArrayList<>();

            for (Story s : authorStories) {
                boolean isOwnStory = s.getAuthor().getId().equals(currentUserId);
                boolean isSeen = isOwnStory || seenIds.contains(s.getId());
                if (!isSeen) hasUnseen = true;

                ReactionType myReaction = myReactionMap.get(s.getId());
                long reactionCount = reactionCounts.getOrDefault(s.getId(), 0L);

                storyResponses.add(StoryResponse.from(s, isSeen, myReaction, reactionCount));
            }

            User author = authorStories.get(0).getAuthor();
            feedResponse.add(new StoryFeedUserResponse(
                    author.getId(),
                    author.getUserName(),
                    author.getAvatarUrl(),
                    hasUnseen,
                    storyResponses
            ));
        }

        feedResponse.sort((a, b) -> {
            if (a.hasUnseenStory() && !b.hasUnseenStory()) return -1;
            if (!a.hasUnseenStory() && b.hasUnseenStory()) return 1;
            if (a.authorId().equals(currentUserId)) return -1;
            if (b.authorId().equals(currentUserId)) return 1;
            LocalDateTime latestA = a.stories().get(a.stories().size() - 1).createdAt();
            LocalDateTime latestB = b.stories().get(b.stories().size() - 1).createdAt();
            return latestB.compareTo(latestA);
        });

        return feedResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public List<StoryResponse> getMyStories(Long currentUserId) {
        LocalDateTime now = LocalDateTime.now();
        List<Story> stories = storyRepository.findActiveStoriesByAuthor(currentUserId, now);

        List<Story> reversed = new ArrayList<>(stories);
        Collections.reverse(reversed);

        if (reversed.isEmpty()) return List.of();

        Set<Long> storyIds = reversed.stream().map(Story::getId).collect(Collectors.toSet());
        Map<Long, Long> reactionCounts = buildReactionCountMap(storyIds);

        return reversed.stream()
                .map(s -> StoryResponse.from(s, true, null, reactionCounts.getOrDefault(s.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public StoryResponse getStory(Long currentUserId, Long storyId) {
        Story story = storyRepository.findActiveById(storyId, LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay Story hoac da het han"));

        storyAccessService.validateCanView(currentUserId, story);

        boolean isOwn = story.getAuthor().getId().equals(currentUserId);
        boolean seen = isOwn || storyViewRepository.existsByStory_IdAndViewer_Id(storyId, currentUserId);

        ReactionType myReaction = storyReactionRepository
                .findByStory_IdAndUser_Id(storyId, currentUserId)
                .map(StoryReaction::getType)
                .orElse(null);

        long reactionCount = storyReactionRepository.countByStory_Id(storyId);

        return StoryResponse.from(story, seen, myReaction, reactionCount);
    }

    @Override
    @Transactional
    public void deleteStory(Long currentUserId, Long storyId) {
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay Story"));
        if (!story.getAuthor().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban khong the xoa Story cua nguoi khac");
        }
        if (story.isDeleted()) return;
        story.setDeleted(true);
        story.setDeletedAt(LocalDateTime.now());
        story.setDeletedBy(story.getAuthor());
        storyRepository.save(story);
    }

    @Override
    @Transactional
    public void viewStory(Long currentUserId, Long storyId) {
        Story story = storyRepository.findActiveById(storyId, LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay Story hoac da het han"));
        storyAccessService.validateCanView(currentUserId, story);
        if (story.getAuthor().getId().equals(currentUserId)) return;
        if (storyViewRepository.existsByStory_IdAndViewer_Id(storyId, currentUserId)) return;
        User viewer = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User khong hop le"));
        StoryView view = new StoryView();
        view.setStory(story);
        view.setViewer(viewer);
        storyViewRepository.save(view);
    }

    @Override
    @Transactional(readOnly = true)
    public StoryViewerListResponse getStoryViewers(Long currentUserId, Long storyId, int page, int limit) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page khong hop le");
        if (limit < 1 || limit > 100) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit phai tu 1 den 100");

        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay Story"));
        if (!story.getAuthor().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chi nguoi tao moi xem duoc danh sach nguoi xem");
        }

        Page<StoryView> viewsPage = storyViewRepository.findByStory_IdOrderByViewedAtDesc(storyId, PageRequest.of(page, limit));
        long totalViews = storyViewRepository.countByStory_Id(storyId);

        List<StoryView> views =
                viewsPage.getContent();

        Set<Long> viewerIds =
                views.stream()
                        .map(view -> view.getViewer().getId())
                        .collect(Collectors.toSet());

        Map<Long, ReactionType> reactionByViewerId =
                viewerIds.isEmpty()
                        ? Map.of()
                        : storyReactionRepository
                                .findByStory_IdAndUser_IdIn(storyId, viewerIds)
                                .stream()
                                .collect(Collectors.toMap(
                                        reaction -> reaction.getUser().getId(),
                                        StoryReaction::getType
                                ));

        return new StoryViewerListResponse(
                storyId,
                totalViews,
                views.stream()
                        .map(view -> StoryViewerResponse.from(
                                view,
                                reactionByViewerId.get(view.getViewer().getId())
                        ))
                        .toList(),
                page,
                limit,
                viewsPage.getTotalPages()
        );
    }

    // ----------------------------------------
    // Helpers: bulk-load reactions
    // ----------------------------------------
    private Map<Long, ReactionType> buildMyReactionMap(Long currentUserId, Set<Long> storyIds) {
        return storyReactionRepository
                .findByUser_IdAndStory_IdIn(currentUserId, storyIds)
                .stream()
                .collect(Collectors.toMap(
                        r -> r.getStory().getId(),
                        StoryReaction::getType
                ));
    }

    private Map<Long, Long> buildReactionCountMap(Set<Long> storyIds) {
        // Query counts per story in bulk
        Map<Long, Long> counts = new HashMap<>();
        for (Long id : storyIds) {
            counts.put(id, storyReactionRepository.countByStory_Id(id));
        }
        return counts;
    }
}

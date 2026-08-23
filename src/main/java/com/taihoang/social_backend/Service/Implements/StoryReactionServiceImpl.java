package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.*;
import com.taihoang.social_backend.Service.NotificationService;
import com.taihoang.social_backend.Service.StoryAccessService;
import com.taihoang.social_backend.Service.StoryReactionService;
import com.taihoang.social_backend.dto.StoryReactionChangedEvent;
import com.taihoang.social_backend.dto.StoryReactionRequest;
import com.taihoang.social_backend.dto.StoryReactionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StoryReactionServiceImpl implements StoryReactionService {

    private final StoryReactionRepository storyReactionRepository;
    private final StoryRepository storyRepository;
    private final StoryViewRepository storyViewRepository;
    private final UserRepository userRepository;
    private final StoryAccessService storyAccessService;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional
    public StoryReactionResponse reactToStory(Long currentUserId, Long storyId, StoryReactionRequest request) {
        // 1. Load active story
        Story story = storyRepository.findActiveById(storyId, LocalDateTime.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Story khong ton tai hoac da het han"));

        // 2. Access check (privacy, friendship)
        storyAccessService.validateCanView(currentUserId, story);

        // 3. Author cannot react own story
        if (story.getAuthor().getId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ban khong the reaction Story cua chinh minh");
        }

        User actor = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User khong hop le"));

        // 4. Ensure StoryView exists (viewer has seen the story)
        ensureViewed(story, actor);

        // 5. Find existing reaction (upsert)
        Optional<StoryReaction> existing = storyReactionRepository.findByStory_IdAndUser_Id(storyId, currentUserId);

        String action;
        StoryReaction reaction;

        if (existing.isEmpty()) {
            // ADD
            reaction = new StoryReaction();
            reaction.setStory(story);
            reaction.setUser(actor);
            reaction.setType(request.type());
            reaction = storyReactionRepository.save(reaction);
            action = "ADD";

            // Send notification only for first-ever reaction (already deduped in notificationService)
            notificationService.notifyStoryReaction(actor, story);

        } else {
            reaction = existing.get();
            if (reaction.getType() == request.type()) {
                // Same type → idempotent, return current state
                return StoryReactionResponse.from(reaction, "ADD");
            }
            // UPDATE
            reaction.setType(request.type());
            reaction = storyReactionRepository.save(reaction);
            action = "UPDATE";
            // No new notification for type change
        }

        // 6. Publish AFTER_COMMIT realtime event
        final String finalAction = action;
        final StoryReaction savedReaction = reaction;
        final String authorEmail = story.getAuthor().getEmail();
        eventPublisher.publishEvent(StoryReactionChangedEvent.of(savedReaction, finalAction, authorEmail));

        return StoryReactionResponse.from(savedReaction, action);
    }

    @Override
    @Transactional
    public void removeReaction(Long currentUserId, Long storyId) {
        // DELETE is allowed regardless of Story active status
        // Only operate on the user's own reaction state
        Optional<StoryReaction> existing = storyReactionRepository.findByStory_IdAndUser_Id(storyId, currentUserId);

        if (existing.isEmpty()) {
            return; // Idempotent
        }

        StoryReaction reaction = existing.get();
        storyReactionRepository.deleteByStory_IdAndUser_Id(storyId, currentUserId);

        // Load author email for realtime (story may be expired but entity still exists)
        Story story = storyRepository.findById(storyId).orElse(null);
        if (story != null) {
            User actor = reaction.getUser();
            eventPublisher.publishEvent(StoryReactionChangedEvent.forRemove(
                    storyId,
                    actor.getId(),
                    actor.getEmail(),
                    actor.getUserName(),
                    actor.getAvatarUrl(),
                    story.getAuthor().getEmail()
            ));
        }
    }

    // ----------------------------------------
    // Helper: ensure StoryView record exists
    // ----------------------------------------
    private void ensureViewed(Story story, User viewer) {
        boolean alreadyViewed = storyViewRepository.existsByStory_IdAndViewer_Id(
                story.getId(), viewer.getId());
        if (!alreadyViewed) {
            StoryView view = new StoryView();
            view.setStory(story);
            view.setViewer(viewer);
            storyViewRepository.save(view);
        }
    }
}

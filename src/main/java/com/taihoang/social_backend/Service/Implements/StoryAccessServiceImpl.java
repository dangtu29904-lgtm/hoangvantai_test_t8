package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Friendship;
import com.taihoang.social_backend.Entity.Story;
import com.taihoang.social_backend.Entity.StoryPrivacy;
import com.taihoang.social_backend.Repository.FriendshipRepository;
import com.taihoang.social_backend.Service.StoryAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class StoryAccessServiceImpl implements StoryAccessService {

    private final FriendshipRepository friendshipRepository;

    @Override
    @Transactional(readOnly = true)
    public void validateCanView(Long currentUserId, Story story) {
        if (!canView(currentUserId, story)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban khong co quyen xem Story nay");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean canView(Long currentUserId, Story story) {
        if (story == null) {
            return false;
        }

        if (story.isDeleted()) {
            return false;
        }

        // Expired stories can only be viewed by the author (for history/viewer list purposes)
        if (story.getExpiresAt().isBefore(LocalDateTime.now())) {
            return story.getAuthor().getId().equals(currentUserId);
        }

        if (story.getAuthor().getId().equals(currentUserId)) {
            return true;
        }

        StoryPrivacy privacy = story.getPrivacy();

        if (privacy == StoryPrivacy.PUBLIC) {
            return true;
        }

        if (privacy == StoryPrivacy.ONLY_ME) {
            return false; // Already checked if currentUser == author
        }

        if (privacy == StoryPrivacy.FRIENDS) {
            // Determine pairKey to search friendship efficiently
            String pairKey = generatePairKey(currentUserId, story.getAuthor().getId());
            return friendshipRepository.findByPairKey(pairKey)
                    .map(f -> f.getStatus() == Friendship.FriendshipStatus.ACCEPTED)
                    .orElse(false);
        }

        return false;
    }

    private String generatePairKey(Long userId1, Long userId2) {
        if (userId1 < userId2) {
            return userId1 + "_" + userId2;
        }
        return userId2 + "_" + userId1;
    }
}

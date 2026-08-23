package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.Story;

public interface StoryAccessService {

    void validateCanView(Long currentUserId, Story story);

    boolean canView(Long currentUserId, Story story);
}

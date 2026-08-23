package com.taihoang.social_backend.Service;

public interface ModerationService {

    void removePost(Long postId, Long adminId);

    void removeComment(Long commentId, Long adminId);

    void suspendUser(Long targetUserId, Long adminId, String reason);

    void unsuspendUser(Long targetUserId, Long adminId);
}

package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.PostCommentRepository;
import com.taihoang.social_backend.Repository.PostRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.ModerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ModerationServiceImpl implements ModerationService {

    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public void removePost(Long postId, Long adminId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay bai viet"));

        User admin = loadUser(adminId);

        // Idempotent: already deleted
        if (post.isDeleted()) {
            return;
        }

        post.softDelete(admin, DeleteType.ADMIN_DELETE);
        postRepository.save(post);
    }

    @Override
    @Transactional
    public void removeComment(Long commentId, Long adminId) {
        PostComment comment = postCommentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay binh luan"));

        User admin = loadUser(adminId);

        // Idempotent
        if (comment.isDeleted()) {
            return;
        }

        comment.softDelete(admin, CommentDeleteType.ADMIN_DELETE);
        postCommentRepository.save(comment);
    }

    @Override
    @Transactional
    public void suspendUser(Long targetUserId, Long adminId, String reason) {
        User admin = loadUser(adminId);
        User target = loadUser(targetUserId);

        // Admin cannot suspend themselves
        if (adminId.equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin khong the tu suspend chinh minh");
        }

        // Admin cannot suspend other admins (no SUPER_ADMIN in scope)
        if (target.getRole() == User.Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khong the suspend tai khoan Admin khac");
        }

        // Idempotent: already suspended
        if (target.getStatus() == UserStatus.SUSPENDED) {
            return;
        }

        target.setStatus(UserStatus.SUSPENDED);
        userRepository.save(target);
    }

    @Override
    @Transactional
    public void unsuspendUser(Long targetUserId, Long adminId) {
        User target = loadUser(targetUserId);

        // Idempotent
        if (target.getStatus() == UserStatus.ACTIVE) {
            return;
        }

        target.setStatus(UserStatus.ACTIVE);
        userRepository.save(target);
    }

    private User loadUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay nguoi dung"));
    }
}

package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.FriendshipRepository;
import com.taihoang.social_backend.Repository.PostCommentRepository;
import com.taihoang.social_backend.Repository.PostRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.PostAccessService;
import com.taihoang.social_backend.Service.PostCommentService;
import com.taihoang.social_backend.dto.CommentListResponse;
import com.taihoang.social_backend.dto.CommentResponse;
import com.taihoang.social_backend.dto.CreateCommentRequest;
import com.taihoang.social_backend.dto.UpdateCommentRequest;
import com.taihoang.social_backend.exception.PostAccessDeniedException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostCommentServiceImpl
        implements PostCommentService {

    private final PostRepository postRepository;

    private final UserRepository userRepository;
    private final PostAccessService postAccessService ;

    private final PostCommentRepository
            postCommentRepository;

    private final FriendshipRepository
            friendshipRepository;
            
    private final com.taihoang.social_backend.Service.NotificationService notificationService;

    @Override
    @Transactional
    public CommentResponse createComment(
            Long currentUserId,
            Long postId,
            CreateCommentRequest request
    ) {

        Post post = postRepository
                .findActiveById(postId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay bai viet"
                        )
                );

        checkViewPermission(
                currentUserId,
                post
        );

        User author = userRepository
                .findById(currentUserId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );

        String content =
                request.content().trim();

        if (content.isBlank()) {

            throw new IllegalArgumentException(
                    "Noi dung binh luan khong duoc de trong"
            );
        }

        PostComment comment =
                new PostComment();

        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(content);

        PostComment saved =
                postCommentRepository.save(comment);
                
        notificationService.notifyPostComment(author, post, saved);

        return toCommentResponse(saved);
    }
    private CommentResponse toCommentResponse(
            PostComment comment
    ) {

        User author = comment.getAuthor();

        return new CommentResponse(
                comment.getId(),
                comment.getPost().getId(),

                comment.getParentComment() == null
                        ? null
                        : comment.getParentComment().getId(),

                author.getId(),
                author.getUserName(),
                author.getAvatarUrl(),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.getUpdatedAt()
        );
    }
    private void checkViewPermission(
            Long currentUserId,
            Post post
    ) {

        Long authorId =
                post.getAuthor().getId();

        if (authorId.equals(currentUserId)) {
            return;
        }

        switch (post.getPrivacy()) {

            case PUBLIC -> {
                return;
            }

            case ONLY_ME -> throw
                    new PostAccessDeniedException(
                            "Ban khong co quyen truy cap bai viet nay"
                    );

            case FRIENDS -> {

                String pairKey =
                        buildPairKey(
                                currentUserId,
                                authorId
                        );

                boolean isFriend =
                        friendshipRepository
                                .findByPairKey(pairKey)
                                .map(friendship ->
                                        friendship.getStatus()
                                                == Friendship
                                                .FriendshipStatus
                                                .ACCEPTED
                                )
                                .orElse(false);

                if (!isFriend) {

                    throw new PostAccessDeniedException(
                            "Ban khong co quyen truy cap bai viet nay"
                    );
                }
            }
        }
    }
    private String buildPairKey(
            Long firstUserId,
            Long secondUserId
    ) {

        Long min = Math.min(
                firstUserId,
                secondUserId
        );

        Long max = Math.max(
                firstUserId,
                secondUserId
        );

        return min + ":" + max;
    }
    @Override
    @Transactional
    public CommentListResponse getComments(
            Long currentUserId,
            Long postId,
            int page,
            int limit
    ) {

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page khong hop le"
            );
        }

        if (limit <= 0 || limit > 100) {
            throw new IllegalArgumentException(
                    "Limit phai nam trong khoang 1 den 100"
            );
        }

        Post post = postRepository
                .findActiveById(postId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay bai viet"
                        )
                );

        checkViewPermission(
                currentUserId,
                post
        );

        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );

        Page<PostComment> commentPage =
                postCommentRepository
                        .findByPost_IdAndDeletedFalseOrderByCreatedAtAscIdAsc(
                                postId,
                                pageable
                        );

        List<CommentResponse> items =
                commentPage
                        .getContent()
                        .stream()
                        .map(this::toCommentResponse)
                        .toList();

        return new CommentListResponse(
                items,
                page,
                limit,
                commentPage.getTotalElements(),
                commentPage.getTotalPages()
        );
    }
    @Override
    @Transactional
    public CommentResponse updateComment(
            Long currentUserId,
            Long commentId,
            UpdateCommentRequest request
    ) {

        PostComment comment =
                postCommentRepository
                        .findActiveById(commentId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Khong tim thay binh luan"
                                )
                        );

        Post post = comment.getPost();

        if (post.isDeleted()) {

            throw new IllegalArgumentException(
                    "Bai viet khong con ton tai"
            );
        }

        if (!comment.getAuthor()
                .getId()
                .equals(currentUserId)) {

            throw new PostAccessDeniedException(
                    "Ban khong co quyen sua binh luan nay"
            );
        }

        String content =
                request.content().trim();

        if (content.isBlank()) {

            throw new IllegalArgumentException(
                    "Noi dung binh luan khong duoc de trong"
            );
        }

        comment.setContent(content);

        PostComment saved =
                postCommentRepository.save(comment);

        return toCommentResponse(saved);
    }
    @Override
    @Transactional
    public void deleteComment(
            Long currentUserId,
            Long commentId
    ) {

        PostComment comment =
                postCommentRepository
                        .findById(commentId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Khong tim thay binh luan"
                                )
                        );

        if (!comment.getAuthor()
                .getId()
                .equals(currentUserId)) {

            throw new PostAccessDeniedException(
                    "Ban khong co quyen xoa binh luan nay"
            );
        }

        // DELETE idempotent
        if (comment.isDeleted()) {
            return;
        }

        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );

        comment.softDelete(
                currentUser,
                CommentDeleteType.USER_DELETE
        );
    }
    @Override
    @Transactional
    public CommentResponse createReply(
            Long currentUserId,
            Long parentCommentId,
            CreateCommentRequest request
    ) {

        PostComment parentComment =
                postCommentRepository
                        .findActiveById(parentCommentId)
                        .orElseThrow(
                                () -> new IllegalArgumentException(
                                        "Khong tim thay binh luan"
                                )
                        );

        Post post = parentComment.getPost();

        if (post.isDeleted()) {

            throw new IllegalArgumentException(
                    "Bai viet khong con ton tai"
            );
        }

        postAccessService.validateCanView(
                currentUserId,
                post
        );

        User author = userRepository
                .findById(currentUserId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );

        String content =
                request.content().trim();

        if (content.isBlank()) {

            throw new IllegalArgumentException(
                    "Noi dung phan hoi khong duoc de trong"
            );
        }

        PostComment reply =
                new PostComment();

        reply.setPost(post);

        reply.setAuthor(author);

        reply.setParentComment(parentComment);

        reply.setContent(content);

        PostComment saved =
                postCommentRepository.save(reply);
                
        notificationService.notifyCommentReply(author, post, saved, parentComment.getAuthor());

        return toCommentResponse(saved);
    }
}

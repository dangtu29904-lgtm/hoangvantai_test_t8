package com.taihoang.social_backend.Service.Implements;
import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.*;
import com.taihoang.social_backend.Service.PostAccessService;
import com.taihoang.social_backend.Service.PostResponseMapper;
import com.taihoang.social_backend.Service.PostService;
import com.taihoang.social_backend.dto.*;
import com.taihoang.social_backend.exception.PostAccessDeniedException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostServiceImpl
        implements PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository ;
    private final ChatUploadRepository chatUploadRepository ;
    private final PostMediaRepository postMediaRepository ;
    private final PostReactionRepository postReactionRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostResponseMapper postResponseMapper;
    private final PostAccessService postAccessService;
    private final PostMentionRepository postMentionRepository;
    private final com.taihoang.social_backend.Service.NotificationService notificationService;
    @Override
    @Transactional
    public PostResponse createPost(
            Long currentUserId,
            CreatePostRequest request
    ) {

        User author =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );


        String content =
                normalizeContent(
                        request.content()
                );


        List<Long> mediaIds =
                normalizeMediaIds(
                        request.mediaIds()
                );

        List<Long> mentionedUserIds =
                normalizeMentionedUserIds(
                        currentUserId,
                        request.mentionedUserIds()
                );

        if (content == null
                && mediaIds.isEmpty()) {

            throw new IllegalArgumentException(
                    "Bai viet phai co noi dung hoac media"
            );
        }


        List<ChatUpload> uploads =
                loadPostUploads(
                        currentUserId,
                        mediaIds
                );

        List<User> mentionedUsers =
                loadMentionedUsers(
                        mentionedUserIds
                );


        Post post =
                new Post();

        post.setAuthor(
                author
        );

        post.setContent(
                content
        );

        post.setPrivacy(
                request.privacy() == null
                        ? PostPrivacy.PUBLIC
                        : request.privacy()
        );


        Post savedPost =
                postRepository.save(
                        post
                );


        List<PostMedia> media =
                createPostMedia(
                        savedPost,
                        mediaIds,
                        uploads
                );

        createPostMentions(
                savedPost,
                mentionedUserIds,
                mentionedUsers
        );


        return postResponseMapper.toResponse(
                currentUserId,
                savedPost,
                media
        );
    }
    @Override
    @Transactional
    public PostDetailResponse getPost(

            Long currentUserId,

            Long postId
    ) {

        Post post =
                postRepository
                        .findActiveById(
                                postId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay bai viet"
                                )
                        );


        checkViewPermission(
                currentUserId,
                post
        );


        List<PostMedia> mediaList =
                postMediaRepository
                        .findByPost_IdOrderBySortOrderAsc(
                                post.getId()
                        );


        PostEngagementResponse engagement =
                buildEngagement(

                        currentUserId,

                        postId
                );


        return toDetailResponse(

                currentUserId,

                post,

                mediaList,

                engagement
        );
    }
    private void checkViewPermission(
            Long currentUserId,
            Post post
    ) {
        postAccessService.validateCanView(currentUserId, post);
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
    public PostResponse updatePost(

            Long currentUserId,

            Long postId,

            UpdatePostRequest request
    ) {

        // ==========================================
        // FIND POST
        // ==========================================

        Post post =
                postRepository
                        .findActiveById(postId)

                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay bai viet"
                                )
                        );


        // ==========================================
        // CHI CHU BAI VIET MOI DUOC SUA
        // ==========================================

        if (!post.getAuthor()
                .getId()
                .equals(currentUserId)) {

            throw new PostAccessDeniedException(
                    "Ban khong co quyen sua bai viet nay"
            );
        }


        // ==========================================
        // CONTENT
        // ==========================================

        String content =
                normalizeContent(
                        request.content()
                );
        // ==========================================
        // MEDIA
        // ==========================================
        List<Long> mediaIds =
                normalizeMediaIds(
                        request.mediaIds()
                );

        List<Long> mentionedUserIds =
                normalizeMentionedUserIds(
                        currentUserId,
                        request.mentionedUserIds()
                );

        // ==========================================
        // POST PHAI CO CONTENT HOAC MEDIA
        // ==========================================
        if (content == null
                && mediaIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "Bai viet phai co noi dung hoac media"
            );
        }
        // ==========================================
        // VALIDATE UPLOAD & MENTIONED USERS
        // ==========================================
        List<ChatUpload> uploads =
                loadPostUploads(
                        currentUserId,
                        mediaIds
                );
        List<User> mentionedUsers =
                loadMentionedUsers(
                        mentionedUserIds
                );
        // ==========================================
        // UPDATE POST
        // ==========================================
        post.setContent(
                content
        );
        post.setPrivacy(
                request.privacy()
        );
        Post savedPost =
                postRepository.save(
                        post
                );
        // ==========================================
        // SYNC MEDIA & MENTIONS
        // ==========================================
        List<PostMedia> mediaList =
                syncPostMedia(

                        savedPost,

                        mediaIds,

                        uploads
                );
        syncPostMentions(
                savedPost,
                mentionedUserIds,
                mentionedUsers
        );
        return postResponseMapper.toResponse(
                currentUserId,
                savedPost,
                mediaList
        );
    }
    @Override
    @Transactional
    public void deletePost(
            Long currentUserId,
            Long postId
    ) {

        Post post = postRepository
                .findById(postId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay bai viet"
                        )
                );

        if (!post.getAuthor()
                .getId()
                .equals(currentUserId)) {

            throw new PostAccessDeniedException(
                    "Ban khong co quyen xoa bai viet nay"
            );
        }
        post.softDelete(post.getAuthor(), com.taihoang.social_backend.Entity.DeleteType.USER_DELETE);

        postRepository.save(post);
    }
    @Override
    @Transactional
    public PostListResponse getUserPosts(
            Long currentUserId,
            Long userId,
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

        userRepository
                .findById(userId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );

        boolean isOwner =
                currentUserId.equals(userId);

        boolean isFriend = false;

        if (!isOwner) {

            String pairKey =
                    buildPairKey(
                            currentUserId,
                            userId
                    );

            isFriend = friendshipRepository
                    .findByPairKey(pairKey)
                    .map(friendship ->
                            friendship.getStatus()
                                    == Friendship
                                    .FriendshipStatus
                                    .ACCEPTED
                    )
                    .orElse(false);
        }

        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );

        Page<Post> postPage =
                postRepository
                        .findVisiblePostsByUser(
                                userId,
                                isOwner,
                                isFriend,
                                pageable
                        );

        List<PostResponse> items =
                postPage.getContent()
                        .stream()
                        .map(post -> postResponseMapper.toResponse(currentUserId, post))
                        .toList();

        return new PostListResponse(
                items,
                page,
                limit,
                postPage.getTotalElements(),
                postPage.getTotalPages()
        );
    }
    @Override
    @Transactional
    public PostListResponse getFeed(
            Long currentUserId,
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

        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );

        Page<Post> postPage =
                postRepository.findFeed(
                        currentUserId,
                        pageable
                );

        List<PostResponse> items =
                postPage.getContent()
                        .stream()
                        .map(post -> postResponseMapper.toResponse(currentUserId, post))
                        .toList();

        return new PostListResponse(
                items,
                page,
                limit,
                postPage.getTotalElements(),
                postPage.getTotalPages()
        );
    }

    @Override
    @Transactional
    public PostListResponse getVideoFeed(
            Long currentUserId,
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

        Pageable pageable =
                PageRequest.of(
                        page,
                        limit
                );

        Page<Post> postPage =
                postRepository.findVideoFeed(
                        currentUserId,
                        pageable
                );

        List<PostResponse> items =
                postPage.getContent()
                        .stream()
                        .map(post -> postResponseMapper.toResponse(currentUserId, post))
                        .toList();

        return new PostListResponse(
                items,
                page,
                limit,
                postPage.getTotalElements(),
                postPage.getTotalPages()
        );
    }

    private List<Long> normalizeMediaIds(
            List<Long> mediaIds
    ) {

        if (mediaIds == null
                || mediaIds.isEmpty()) {

            return List.of();
        }

        List<Long> normalized =
                mediaIds.stream()
                        .distinct()
                        .toList();

        if (normalized.size() > 10) {

            throw new IllegalArgumentException(
                    "Bai viet toi da 10 media"
            );
        }

        return normalized;
    }
    private String normalizeContent(
            String content
    ) {

        if (content == null) {
            return null;
        }

        String normalized =
                content.trim();

        return normalized.isEmpty()
                ? null
                : normalized;
    }
    private List<ChatUpload> loadPostUploads(

            Long currentUserId,

            List<Long> mediaIds
    ) {

        if (mediaIds.isEmpty()) {
            return List.of();
        }


        List<ChatUpload> uploads =

                chatUploadRepository
                        .findOwnedUploadsForUpdate(

                                mediaIds,

                                currentUserId
                        );


        if (uploads.size()
                != mediaIds.size()) {

            throw new IllegalArgumentException(
                    "Co media khong ton tai hoac khong thuoc user"
            );
        }


        for (ChatUpload upload : uploads) {

            if (upload.getAttachmentType()
                    != AttachmentType.IMAGE

                    && upload.getAttachmentType()
                    != AttachmentType.VIDEO) {

                throw new IllegalArgumentException(
                        "Bai viet chi ho tro IMAGE va VIDEO"
                );
            }
        }


        return uploads;
    }
    private List<PostMedia> createPostMedia(

            Post post,

            List<Long> mediaIds,

            List<ChatUpload> uploads
    ) {

        Map<Long, ChatUpload> uploadMap =

                uploads.stream()
                        .collect(
                                Collectors.toMap(
                                        ChatUpload::getId,
                                        upload -> upload
                                )
                        );


        List<PostMedia> postMediaList =
                new ArrayList<>();


        for (int i = 0;
             i < mediaIds.size();
             i++) {

            Long uploadId =
                    mediaIds.get(i);


            ChatUpload upload =
                    uploadMap.get(uploadId);


            PostMedia media =
                    new PostMedia();

            media.setPost(
                    post
            );

            media.setUpload(
                    upload
            );

            media.setSortOrder(
                    i
            );


            postMediaList.add(
                    media
            );


            upload.setUsedAt(
                    LocalDateTime.now()
            );
        }


        chatUploadRepository
                .saveAll(uploads);


        return postMediaRepository
                .saveAll(
                        postMediaList
                );
    }
    private List<PostMedia> syncPostMedia(
            Post post,
            List<Long> desiredMediaIds,
            List<ChatUpload> uploads
    ) {
        // ==========================================
        // MEDIA HIEN TAI CUA POST
        // ==========================================
        List<PostMedia> existingMedia =
                postMediaRepository
                        .findByPost_IdOrderBySortOrderAsc(
                                post.getId()
                        );
        // uploadId -> PostMedia hiện tại
        Map<Long, PostMedia> existingByUploadId =
                existingMedia.stream()
                        .collect(
                                Collectors.toMap(

                                        postMedia ->
                                                postMedia
                                                        .getUpload()
                                                        .getId(),

                                        postMedia ->
                                                postMedia
                                )
                        );
        // ==========================================
        // UPLOAD DATA
        // ==========================================
        Map<Long, ChatUpload> uploadMap =
                uploads.stream()
                        .collect(
                                Collectors.toMap(
                                        ChatUpload::getId,
                                        upload -> upload
                                )
                        );
        List<PostMedia> finalMedia =
                new ArrayList<>();
        // ==========================================
        // GIU MEDIA CU + THEM MEDIA MOI
        // ==========================================
        for (int i = 0;
             i < desiredMediaIds.size();
             i++) {
            Long uploadId =
                    desiredMediaIds.get(i);
            PostMedia media =
                    existingByUploadId.remove(
                            uploadId
                    );
            // ======================================
            // MEDIA MOI
            // ======================================
            if (media == null) {
                ChatUpload upload =
                        uploadMap.get(uploadId);
                media =
                        new PostMedia();
                media.setPost(
                        post
                );
                media.setUpload(
                        upload
                );
                if (upload.getUsedAt() == null) {
                    upload.setUsedAt(
                            LocalDateTime.now()
                    );
                    chatUploadRepository.save(
                            upload
                    );
                }
            }
            // ======================================
            // CAP NHAT THU TU
            // ======================================
            media.setSortOrder(
                    i
            );
            finalMedia.add(
                    media
            );
        }
        // ==========================================
        // PHAN CON LAI = MEDIA BI REMOVE
        // ==========================================
        if (!existingByUploadId.isEmpty()) {
            postMediaRepository.deleteAll(
                    existingByUploadId.values()
            );
        }
        // =========================================
        // SAVE
        // ==========================================
        return postMediaRepository
                .saveAll(
                        finalMedia
                );
    }
    private PostEngagementResponse buildEngagement(

            Long currentUserId,

            Long postId
    ) {

        // =============================
        // TOTAL REACTION
        // =============================

        long totalReactions =
                postReactionRepository
                        .countByPost_Id(
                                postId
                        );


        // =============================
        // MY REACTION
        // =============================

        ReactionType myReaction =
                postReactionRepository
                        .findByPost_IdAndUser_Id(

                                postId,

                                currentUserId
                        )

                        .map(
                                PostReaction::getType
                        )

                        .orElse(null);


        // =============================
        // REACTION COUNTS
        // =============================

        Map<ReactionType, Long> reactionCounts =

                postReactionRepository
                        .countReactionTypes(
                                postId
                        )

                        .stream()

                        .collect(
                                Collectors.toMap(

                                        ReactionCountProjection::getType,

                                        ReactionCountProjection::getCount
                                )
                        );


        // =============================
        // COMMENT COUNT
        // =============================

        long commentCount =
                postCommentRepository
                        .countByPost_IdAndDeletedFalse(
                                postId
                        );
        return new PostEngagementResponse(
                totalReactions,
                reactionCounts,
                myReaction,
                commentCount
        );
    }
    private PostDetailResponse toDetailResponse(

            Long currentUserId,

            Post post,

            List<PostMedia> mediaList,

            PostEngagementResponse engagement
    ) {

        User author =
                post.getAuthor();


        List<PostMediaResponse> media =

                mediaList.stream()

                        .map(postMedia -> {

                            ChatUpload upload =
                                    postMedia.getUpload();

                            return new PostMediaResponse(

                                    postMedia.getId(),

                                    upload.getId(),

                                    upload.getAttachmentType(),

                                    upload.getSecureUrl(),

                                    upload.getOriginalFileName(),

                                    postMedia.getSortOrder()
                            );
                        })

                        .toList();

        List<MentionedUserResponse> mentions =
                postMentionRepository
                        .findByPost_IdOrderBySortOrderAsc(post.getId())
                        .stream()
                        .map(pm -> {
                            User u = pm.getMentionedUser();
                            return new MentionedUserResponse(
                                    u.getId(),
                                    u.getUserName(),
                                    u.getAvatarUrl()
                            );
                        })
                        .toList();

        long shareCount =
                getShareCount(post);

        OriginalPostResponse originalPost =
                buildOriginalPost(currentUserId, post);


        return new PostDetailResponse(

                post.getId(),

                author.getId(),

                author.getUserName(),

                author.getAvatarUrl(),

                post.getContent(),

                post.getPrivacy(),

                media,

                mentions,

                engagement,

                shareCount,

                originalPost,

                post.getCreatedAt(),

                post.getUpdatedAt()
        );
    }

    private long getShareCount(Post post) {
        Long targetPostId = post.getSharedPost() == null
                ? post.getId()
                : post.getSharedPost().getId();
        return postRepository.countBySharedPost_IdAndDeletedFalse(targetPostId);
    }

    private OriginalPostResponse buildOriginalPost(Long currentUserId, Post post) {
        if (post.getSharedPost() == null) {
            return null;
        }

        Post originalPost = post.getSharedPost();

        if (!postAccessService.canView(currentUserId, originalPost)) {
            return unavailableOriginalPost();
        }

        List<PostMedia> originalMedia = postMediaRepository.findByPost_IdOrderBySortOrderAsc(originalPost.getId());

        List<PostMediaResponse> media = originalMedia.stream()
                .map(pm -> {
                    ChatUpload upload = pm.getUpload();
                    return new PostMediaResponse(
                            pm.getId(),
                            upload.getId(),
                            upload.getAttachmentType(),
                            upload.getSecureUrl(),
                            upload.getOriginalFileName(),
                            pm.getSortOrder()
                    );
                })
                .toList();

        List<MentionedUserResponse> mentions = postMentionRepository
                .findByPost_IdOrderBySortOrderAsc(originalPost.getId())
                .stream()
                .map(pm -> {
                    User u = pm.getMentionedUser();
                    return new MentionedUserResponse(
                            u.getId(),
                            u.getUserName(),
                            u.getAvatarUrl()
                    );
                })
                .toList();

        User author = originalPost.getAuthor();

        return new OriginalPostResponse(
                true,
                originalPost.getId(),
                author.getId(),
                author.getUserName(),
                author.getAvatarUrl(),
                originalPost.getContent(),
                originalPost.getPrivacy(),
                media,
                mentions,
                originalPost.getCreatedAt()
        );
    }

    private OriginalPostResponse unavailableOriginalPost() {
        return new OriginalPostResponse(
                false,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                null
        );
    }

    private List<Long> normalizeMentionedUserIds(
            Long currentUserId,
            List<Long> mentionedUserIds
    ) {
        if (mentionedUserIds == null || mentionedUserIds.isEmpty()) {
            return List.of();
        }

        List<Long> distinctIds = mentionedUserIds.stream()
                .filter(id -> id != null && !id.equals(currentUserId))
                .distinct()
                .toList();

        if (distinctIds.size() > 20) {
            throw new IllegalArgumentException(
                    "Bai viet toi da mention 20 user"
            );
        }

        return distinctIds;
    }

    private List<User> loadMentionedUsers(
            List<Long> mentionedUserIds
    ) {
        if (mentionedUserIds.isEmpty()) {
            return List.of();
        }

        List<User> users = userRepository.findAllById(mentionedUserIds);

        if (users.size() != mentionedUserIds.size()) {
            throw new IllegalArgumentException(
                    "Co user duoc mention khong ton tai"
            );
        }

        return users;
    }

    private List<PostMention> createPostMentions(
            Post post,
            List<Long> mentionedUserIds,
            List<User> mentionedUsers
    ) {
        if (mentionedUserIds.isEmpty()) {
            return List.of();
        }

        Map<Long, User> userMap = mentionedUsers.stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        List<PostMention> mentions = new ArrayList<>();

        for (int i = 0; i < mentionedUserIds.size(); i++) {
            Long userId = mentionedUserIds.get(i);
            User user = userMap.get(userId);

            PostMention mention = new PostMention();
            mention.setPost(post);
            mention.setMentionedUser(user);
            mention.setSortOrder(i);

            mentions.add(mention);
            
            notificationService.notifyPostMention(post.getAuthor(), post, user);
        }

        return postMentionRepository.saveAll(mentions);
    }

    private List<PostMention> syncPostMentions(
            Post post,
            List<Long> desiredUserIds,
            List<User> desiredUsers
    ) {
        List<PostMention> existingMentions =
                postMentionRepository.findByPost_IdOrderBySortOrderAsc(post.getId());

        Map<Long, PostMention> existingByUserId = existingMentions.stream()
                .collect(Collectors.toMap(
                        pm -> pm.getMentionedUser().getId(),
                        pm -> pm
                ));

        Map<Long, User> desiredUserMap = desiredUsers.stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<PostMention> finalMentions = new ArrayList<>();

        for (int i = 0; i < desiredUserIds.size(); i++) {
            Long userId = desiredUserIds.get(i);
            PostMention existing = existingByUserId.remove(userId);

            if (existing != null) {
                existing.setSortOrder(i);
                finalMentions.add(existing);
            } else {
                User user = desiredUserMap.get(userId);
                PostMention newMention = new PostMention();
                newMention.setPost(post);
                newMention.setMentionedUser(user);
                newMention.setSortOrder(i);
                finalMentions.add(newMention);
                
                notificationService.notifyPostMention(post.getAuthor(), post, user);
            }
        }

        if (!existingByUserId.isEmpty()) {
            postMentionRepository.deleteAll(existingByUserId.values());
        }

        return postMentionRepository.saveAll(finalMentions);
    }
    @Override
    @Transactional
    public SharePostResponse sharePost(

            Long currentUserId,

            Long postId,

            SharePostRequest request
    ) {

        // ==========================================
        // POST MA USER BAM SHARE
        // ==========================================

        Post targetPost =
                postRepository
                        .findActiveById(postId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay bai viet"
                                )
                        );


        // User phai xem duoc bai nay
        checkViewPermission(
                currentUserId,
                targetPost
        );


        // ==========================================
        // TIM BAI GOC
        // ==========================================

        Post originalPost =

                targetPost.getSharedPost() != null

                        ? targetPost.getSharedPost()

                        : targetPost;


        // ==========================================
        // BAI GOC PHAI CON TON TAI
        // ==========================================

        if (originalPost.isDeleted()) {

            throw new IllegalArgumentException(
                    "Bai viet goc khong con ton tai"
            );
        }


        // Nếu đang share một bài share thì
        // vẫn phải có quyền xem bài gốc
        checkViewPermission(
                currentUserId,
                originalPost
        );


        // ==========================================
        // ONLY_ME KHONG CHO SHARE
        // ==========================================

        if (originalPost.getPrivacy()
                == PostPrivacy.ONLY_ME) {

            throw new IllegalArgumentException(
                    "Bai viet ONLY_ME khong the chia se"
            );
        }


        // ==========================================
        // CURRENT USER
        // ==========================================

        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );


        // ==========================================
        // CAPTION
        // ==========================================

        String content =
                normalizeContent(
                        request.content()
                );


        // ==========================================
        // PRIVACY
        // ==========================================

        PostPrivacy privacy =

                request.privacy() == null

                        ? PostPrivacy.PUBLIC

                        : request.privacy();


        /*
         * Không được biến bài FRIENDS thành
         * một share PUBLIC.
         */
        if (originalPost.getPrivacy()
                == PostPrivacy.FRIENDS

                && privacy == PostPrivacy.PUBLIC) {

            privacy =
                    PostPrivacy.FRIENDS;
        }


        // ==========================================
        // CREATE SHARE POST
        // ==========================================

        List<Long> mentionedUserIds =
                normalizeMentionedUserIds(
                        currentUserId,
                        request.mentionedUserIds()
                );

        List<User> mentionedUsers =
                loadMentionedUsers(
                        mentionedUserIds
                );

        Post sharePost =
                new Post();


        sharePost.setAuthor(
                currentUser
        );

        sharePost.setContent(
                content
        );

        sharePost.setPrivacy(
                privacy
        );

        sharePost.setSharedPost(
                originalPost
        );


        Post saved =
                postRepository.save(
                        sharePost
                );

        createPostMentions(
                saved,
                mentionedUserIds,
                mentionedUsers
        );
        
        notificationService.notifyPostShare(currentUser, originalPost, saved);


        return new SharePostResponse(

                saved.getId(),

                currentUser.getId(),

                currentUser.getUserName(),

                saved.getContent(),

                saved.getPrivacy(),

                originalPost.getId(),

                saved.getCreatedAt()
        );
    }
}

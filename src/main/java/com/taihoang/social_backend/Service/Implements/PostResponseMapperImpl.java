package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.ChatUpload;
import com.taihoang.social_backend.Entity.Post;
import com.taihoang.social_backend.Entity.PostMedia;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.PostMediaRepository;
import com.taihoang.social_backend.Repository.PostMentionRepository;
import com.taihoang.social_backend.Repository.PostRepository;
import com.taihoang.social_backend.Service.PostAccessService;
import com.taihoang.social_backend.Service.PostResponseMapper;
import com.taihoang.social_backend.dto.MentionedUserResponse;
import com.taihoang.social_backend.dto.OriginalPostResponse;
import com.taihoang.social_backend.dto.PostMediaResponse;
import com.taihoang.social_backend.dto.PostResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class PostResponseMapperImpl
        implements PostResponseMapper {

    private final PostMediaRepository
            postMediaRepository;
    private final PostMentionRepository
            postMentionRepository;
    private final PostAccessService
            postAccessService;
    private final PostRepository
            postRepository;

    @Override
    public PostResponse toResponse(

            Long currentUserId,

            Post post
    ) {

        List<PostMedia> mediaList =
                postMediaRepository
                        .findByPost_IdOrderBySortOrderAsc(
                                post.getId()
                        );


        return toResponse(
                currentUserId,
                post,
                mediaList
        );
    }


    @Override
    public PostResponse toResponse(

            Long currentUserId,

            Post post,

            List<PostMedia> mediaList
    ) {

        User author =
                post.getAuthor();


        List<PostMediaResponse> media =
                mediaList.stream()
                        .map(this::toMediaResponse)
                        .toList();

        List<MentionedUserResponse> mentions =
                buildMentions(post.getId());

        long shareCount =
                getShareCount(
                        post
                );


        OriginalPostResponse originalPost =
                buildOriginalPost(
                        currentUserId,
                        post
                );


        return new PostResponse(

                post.getId(),

                author.getId(),

                author.getUserName(),

                author.getAvatarUrl(),

                post.getContent(),

                post.getPrivacy(),

                media,

                mentions,

                shareCount,

                originalPost,

                post.getCreatedAt(),

                post.getUpdatedAt()
        );
    }

    private OriginalPostResponse buildOriginalPost(

            Long currentUserId,

            Post post
    ) {

        // Bài bình thường
        if (post.getSharedPost() == null) {

            return null;
        }


        Post originalPost =
                post.getSharedPost();


        // ====================================
        // KIEM TRA QUYEN BAI GOC
        // ====================================

        if (!postAccessService.canView(
                currentUserId,
                originalPost
        )) {

            return unavailableOriginalPost();
        }


        // ====================================
        // MEDIA BAI GOC
        // ====================================

        List<PostMedia> originalMedia =
                postMediaRepository
                        .findByPost_IdOrderBySortOrderAsc(
                                originalPost.getId()
                        );


        List<PostMediaResponse> media =
                originalMedia.stream()
                        .map(this::toMediaResponse)
                        .toList();

        List<MentionedUserResponse> mentions =
                buildMentions(originalPost.getId());

        User author =
                originalPost.getAuthor();


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

    private List<MentionedUserResponse> buildMentions(Long postId) {

        return postMentionRepository
                .findByPost_IdOrderBySortOrderAsc(postId)
                .stream()
                .map(mention -> {
                    User user = mention.getMentionedUser();
                    return new MentionedUserResponse(
                            user.getId(),
                            user.getUserName(),
                            user.getAvatarUrl()
                    );
                })
                .toList();
    }

    private PostMediaResponse toMediaResponse(
            PostMedia postMedia
    ) {

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

    private long getShareCount(
            Post post
    ) {

        Long targetPostId =

                post.getSharedPost() == null

                        ? post.getId()

                        : post.getSharedPost().getId();


        return postRepository
                .countBySharedPost_IdAndDeletedFalse(
                        targetPostId
                );
    }
}
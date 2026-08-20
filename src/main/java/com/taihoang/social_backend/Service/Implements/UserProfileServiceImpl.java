package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.UserProfileService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {
    private final UserRepository userRepository;

    public MyProfileResponse getMyProfile(Long userId) {

        User user = getUser(userId);

        return toMyProfileResponse(user);
    }

    public UserProfileResponse getProfile(Long userId) {

        User user = getUser(userId);

        return toUserProfileResponse(user);
    }

    @Transactional
    public MyProfileResponse updateProfile(
            Long userId,
            UpdateProfileRequest request
    ) {

        User user = getUser(userId);

        if (request.userName() != null) {
            user.setUserName(request.userName().trim());
        }

        if (request.bio() != null) {
            user.setBio(request.bio().trim());
        }

        if (request.dateOfBirth() != null) {
            user.setDateOfBirth(request.dateOfBirth());
        }

        if (request.gender() != null) {
            user.setGender(request.gender());
        }

        User savedUser = userRepository.save(user);

        return toMyProfileResponse(savedUser);
    }
    public UserSearchResponse searchUsers(
            Long currentUserId,
            String keyword,
            int page,
            int limit
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (keyword == null || keyword.trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Tu khoa tim kiem khong duoc de trong"
            );
        }

        if (page < 0) {
            throw new IllegalArgumentException(
                    "Page khong hop le"
            );
        }

        if (limit < 1 || limit > 50) {
            throw new IllegalArgumentException(
                    "Limit phai nam trong khoang 1 den 50"
            );
        }

        String normalizedKeyword = keyword.trim();

        Page<User> result = userRepository.searchUsers(
                normalizedKeyword,
                currentUserId,
                PageRequest.of(page, limit)
        );

        var items = result.getContent()
                .stream()
                .map(user -> new UserSearchItemResponse(
                        user.getId(),
                        user.getUserName(),
                        user.getAvatarUrl(),
                        user.getBio()
                ))
                .toList();

        return new UserSearchResponse(
                items,
                page,
                limit,
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    private User getUser(Long userId) {

        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException(
                    "userId khong hop le"
            );
        }

        return userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Khong tim thay user"
                        )
                );
    }

    private UserProfileResponse toUserProfileResponse(User user) {

        return new UserProfileResponse(
                user.getId(),
                user.getUserName(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getBio(),
                user.getDateOfBirth(),
                user.getGender(),
                user.getCreatAt()
        );
    }

    private MyProfileResponse toMyProfileResponse(User user) {

        return new MyProfileResponse(
                user.getId(),
                user.getUserName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getCoverUrl(),
                user.getBio(),
                user.getDateOfBirth(),
                user.getGender(),
                user.getCreatAt()
        );
    }
}

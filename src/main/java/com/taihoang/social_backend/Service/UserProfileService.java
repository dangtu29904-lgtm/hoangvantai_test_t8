package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.MyProfileResponse;
import com.taihoang.social_backend.dto.UpdateProfileRequest;
import com.taihoang.social_backend.dto.UserProfileResponse;
import com.taihoang.social_backend.dto.UserSearchResponse;

public interface UserProfileService {
    public MyProfileResponse getMyProfile(Long userId) ;
    public UserProfileResponse getProfile(Long userId)  ;
    public MyProfileResponse updateProfile(Long userId , UpdateProfileRequest request)  ;
    public UserSearchResponse searchUsers(Long currentUserId ,String keyword, int page , int limit ) ;
}

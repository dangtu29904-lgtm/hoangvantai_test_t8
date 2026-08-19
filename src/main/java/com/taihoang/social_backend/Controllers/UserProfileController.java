package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.UserProfileService;
import com.taihoang.social_backend.dto.MyProfileResponse;
import com.taihoang.social_backend.dto.UpdateProfileRequest;
import com.taihoang.social_backend.dto.UserProfileResponse;
import com.taihoang.social_backend.dto.UserSearchResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;
    @GetMapping("/me")
    public MyProfileResponse getMyProfile(
            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser
    ) {

        validateAuthentication(currentUser);

        return userProfileService.getMyProfile(
                currentUser.getId()
        );
    }


    @GetMapping("/search")
    public UserSearchResponse searchUsers(
            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @RequestParam String q,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "20")
            int limit
    ) {

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return userProfileService.searchUsers(
                    currentUser.getId(),
                    q,
                    page,
                    limit
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }

    @GetMapping("/{userId}")
    public UserProfileResponse getProfile(
            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable Long userId
    ) {

        validateAuthentication(currentUser);

        try {

            return userProfileService.getProfile(userId);

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }

    @PutMapping("/me")
    public MyProfileResponse updateMyProfile(
            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @Valid
            @RequestBody
            UpdateProfileRequest request
    ) {

        validateAuthentication(currentUser);

        try {

            return userProfileService.updateProfile(
                    currentUser.getId(),
                    request
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }

    private void validateAuthentication(
            AuthenticatedUserDetails currentUser
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }
    }
}

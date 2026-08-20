package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.NotificationService;
import com.taihoang.social_backend.dto.NotificationListResponse;
import com.taihoang.social_backend.dto.NotificationReadAllResponse;
import com.taihoang.social_backend.dto.NotificationReadResponse;
import com.taihoang.social_backend.dto.UnreadNotificationCountResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public NotificationListResponse getNotifications(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

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

            return notificationService.getNotifications(
                    currentUser.getId(),
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
    @PatchMapping("/{notificationId}/read")
    public NotificationReadResponse markAsRead(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long notificationId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return notificationService.markAsRead(
                    currentUser.getId(),
                    notificationId
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @PatchMapping("/read-all")
    public NotificationReadAllResponse markAllAsRead(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return notificationService.markAllAsRead(
                    currentUser.getId()
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/unread-count")
    public UnreadNotificationCountResponse getUnreadCount(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return notificationService.getUnreadCount(
                    currentUser.getId()
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
}
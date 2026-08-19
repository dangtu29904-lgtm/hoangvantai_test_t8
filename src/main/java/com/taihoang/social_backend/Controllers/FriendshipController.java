package com.taihoang.social_backend.Controllers;
import com.taihoang.social_backend.Service.FriendshipService;
import com.taihoang.social_backend.dto.FriendListResponse;
import com.taihoang.social_backend.dto.FriendRequestListResponse;
import com.taihoang.social_backend.dto.FriendRequestResponse;
import com.taihoang.social_backend.dto.FriendStatusResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/user/friends")
@RequiredArgsConstructor
public class FriendshipController {

    private final FriendshipService friendshipService;

    @PostMapping("/requests/{receiverId}")
    public ResponseEntity<FriendRequestResponse>
    sendFriendRequest(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long receiverId
    ) {

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            FriendRequestResponse response =
                    friendshipService.sendFriendRequest(
                            currentUser.getId(),
                            receiverId
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(response);

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/requests/received")
    public FriendRequestListResponse getReceivedRequests(

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

            return friendshipService.getReceivedRequests(
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
    @PostMapping("/requests/{requestId}/accept")
    public FriendRequestResponse acceptFriendRequest(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long requestId
    ) {

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return friendshipService.acceptFriendRequest(
                    currentUser.getId(),
                    requestId
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @PostMapping("/requests/{requestId}/reject")
    public FriendRequestResponse rejectFriendRequest(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long requestId
    ) {

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return friendshipService.rejectFriendRequest(
                    currentUser.getId(),
                    requestId
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping
    public FriendListResponse getFriends(

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

            return friendshipService.getFriends(
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
    @DeleteMapping("/{friendId}")
    public ResponseEntity<Void> unfriend(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long friendId
    ) {

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            friendshipService.unfriend(
                    currentUser.getId(),
                    friendId
            );

            return ResponseEntity.noContent().build();

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/status/{userId}")
    public FriendStatusResponse getFriendStatus(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long userId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            return friendshipService.getFriendStatus(
                    currentUser.getId(),
                    userId
            );

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/requests/sent")
    public FriendRequestListResponse getSentRequests(

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

            return friendshipService.getSentRequests(
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
    @DeleteMapping("/requests/{requestId}")
    public ResponseEntity<Void> cancelFriendRequest(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long requestId
    ) {

        if (currentUser == null) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Chua dang nhap"
            );
        }

        try {

            friendshipService.cancelFriendRequest(
                    currentUser.getId(),
                    requestId
            );

            return ResponseEntity
                    .noContent()
                    .build();

        } catch (IllegalArgumentException exception) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    exception.getMessage(),
                    exception
            );
        }
    }
    @GetMapping("/{userId}/friends")
    public FriendListResponse getUserFriends(

            @AuthenticationPrincipal
            AuthenticatedUserDetails currentUser,

            @PathVariable
            Long userId,

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

            return friendshipService.getUserFriends(
                    userId,
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
}

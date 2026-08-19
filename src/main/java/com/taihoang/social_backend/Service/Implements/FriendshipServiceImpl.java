package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Friendship;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.FriendshipRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.FriendshipService;
import com.taihoang.social_backend.Service.NotificationService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FriendshipServiceImpl implements FriendshipService {
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public FriendRequestResponse sendFriendRequest(
            Long currentUserId,
            Long receiverId
    ) {

        validateRequest(currentUserId, receiverId);

        User requester = userRepository.findById(currentUserId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Khong tim thay user gui loi moi"
                        )
                );

        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Khong tim thay user nhan loi moi"
                        )
                );

        String pairKey = buildPairKey(
                currentUserId,
                receiverId
        );

        Friendship existing = friendshipRepository
                .findByPairKey(pairKey)
                .orElse(null);

        if (existing != null) {

            if (existing.getStatus()
                    == Friendship.FriendshipStatus.ACCEPTED) {

                throw new IllegalArgumentException(
                        "Hai user da la ban be"
                );
            }

            if (existing.getStatus()
                    == Friendship.FriendshipStatus.PENDING) {

                if (existing.getRequester()
                        .getId()
                        .equals(currentUserId)) {

                    throw new IllegalArgumentException(
                            "Ban da gui loi moi ket ban cho user nay"
                    );
                }

                throw new IllegalArgumentException(
                        "User nay da gui loi moi ket ban cho ban"
                );
            }

            // Nếu trước đó bị REJECTED,
            // cho phép gửi request lại
            existing.setRequester(requester);
            existing.setReceiver(receiver);
            existing.setStatus(
                    Friendship.FriendshipStatus.PENDING
            );

            Friendship saved =
                    friendshipRepository.save(existing);
            notificationService
                    .createFriendRequestNotification(
                            requester,
                            receiver,
                            saved.getId()
                    );

            return toResponse(saved);
        }

        Friendship friendship = new Friendship();

        friendship.setRequester(requester);
        friendship.setReceiver(receiver);
        friendship.setPairKey(pairKey);
        friendship.setStatus(
                Friendship.FriendshipStatus.PENDING
        );

        Friendship saved =
                friendshipRepository.save(friendship);

        notificationService
                .createFriendRequestNotification(
                        requester,
                        receiver,
                        saved.getId()
                );
        return toResponse(saved);
    }

    private void validateRequest(
            Long currentUserId,
            Long receiverId
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (receiverId == null || receiverId <= 0) {
            throw new IllegalArgumentException(
                    "receiverId khong hop le"
            );
        }

        if (currentUserId.equals(receiverId)) {
            throw new IllegalArgumentException(
                    "Khong the gui loi moi ket ban cho chinh minh"
            );
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

    private FriendRequestResponse toResponse(
            Friendship friendship
    ) {

        return new FriendRequestResponse(
                friendship.getId(),
                friendship.getRequester().getId(),
                friendship.getRequester().getUserName(),
                friendship.getReceiver().getId(),
                friendship.getReceiver().getUserName(),
                friendship.getStatus(),
                friendship.getCreatedAt()
        );
    }
    public FriendRequestListResponse getReceivedRequests(
            Long currentUserId,
            int page,
            int limit
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
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

        PageRequest pageable = PageRequest.of(
                page,
                limit,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );

        Page<Friendship> result =
                friendshipRepository.findByReceiver_IdAndStatus(
                        currentUserId,
                        Friendship.FriendshipStatus.PENDING,
                        pageable
                );

        var items = result.getContent()
                .stream()
                .map(friendship ->
                        new FriendRequestItemResponse(
                                friendship.getId(),
                                friendship.getRequester().getId(),
                                friendship.getRequester().getUserName(),
                                friendship.getRequester().getAvatarUrl(),
                                friendship.getCreatedAt()
                        )
                )
                .toList();

        return new FriendRequestListResponse(
                items,
                page,
                limit,
                result.getTotalElements(),
                result.getTotalPages()
        );
    }
    @Transactional
    public FriendRequestResponse acceptFriendRequest(
            Long currentUserId,
            Long requestId
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (requestId == null || requestId <= 0) {
            throw new IllegalArgumentException(
                    "requestId khong hop le"
            );
        }

        Friendship friendship =
                friendshipRepository.findByIdForUpdate(requestId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay loi moi ket ban"
                                )
                        );

        /*
         * Chỉ người nhận mới được accept.
         */
        if (!friendship.getReceiver()
                .getId()
                .equals(currentUserId)) {

            throw new IllegalArgumentException(
                    "Ban khong co quyen chap nhan loi moi nay"
            );
        }

        /*
         * Nếu đã ACCEPTED rồi thì trả luôn.
         * Giúp API mang tính idempotent.
         */
        if (friendship.getStatus()
                == Friendship.FriendshipStatus.ACCEPTED) {

            return toResponse(friendship);
        }

        /*
         * Request đã bị reject thì không được accept nữa.
         * Muốn kết bạn lại phải tạo request mới.
         */
        if (friendship.getStatus()
                == Friendship.FriendshipStatus.REJECTED) {

            throw new IllegalArgumentException(
                    "Loi moi ket ban nay da bi tu choi"
            );
        }

        friendship.setStatus(
                Friendship.FriendshipStatus.ACCEPTED
        );

        Friendship saved =
                friendshipRepository.save(friendship);
        notificationService
                .createFriendAcceptedNotification(

                        // B là người accept
                        saved.getReceiver(),

                        // A là người cần nhận thông báo
                        saved.getRequester(),

                        saved.getId()
                );
        return toResponse(saved);
    }
    @Transactional
    public FriendRequestResponse rejectFriendRequest(
            Long currentUserId,
            Long requestId
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (requestId == null || requestId <= 0) {
            throw new IllegalArgumentException(
                    "requestId khong hop le"
            );
        }

        Friendship friendship =
                friendshipRepository.findById(requestId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay loi moi ket ban"
                                )
                        );

        // Chỉ người nhận mới được reject
        if (!friendship.getReceiver()
                .getId()
                .equals(currentUserId)) {

            throw new IllegalArgumentException(
                    "Ban khong co quyen tu choi loi moi nay"
            );
        }

        // Chỉ request đang PENDING mới được reject
        if (friendship.getStatus()
                != Friendship.FriendshipStatus.PENDING) {

            throw new IllegalArgumentException(
                    "Loi moi ket ban da duoc xu ly"
            );
        }

        friendship.setStatus(
                Friendship.FriendshipStatus.REJECTED
        );

        Friendship saved =
                friendshipRepository.save(friendship);

        return toResponse(saved);
    }
    public FriendListResponse getFriends(
            Long currentUserId,
            int page,
            int limit
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
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

        PageRequest pageable = PageRequest.of(
                page,
                limit,
                Sort.by(
                        Sort.Direction.DESC,
                        "updatedAt"
                )
        );

        Page<Friendship> result =
                friendshipRepository.findFriends(
                        currentUserId,
                        Friendship.FriendshipStatus.ACCEPTED,
                        pageable
                );

        var items = result.getContent()
                .stream()
                .map(friendship -> {

                    User friend;

                    if (friendship.getRequester()
                            .getId()
                            .equals(currentUserId)) {

                        friend = friendship.getReceiver();

                    } else {

                        friend = friendship.getRequester();
                    }

                    return new FriendItemResponse(
                            friend.getId(),
                            friend.getUserName(),
                            friend.getAvatarUrl(),
                            friend.getBio(),
                            friendship.getUpdatedAt()
                    );
                })
                .toList();

        return new FriendListResponse(
                items,
                page,
                limit,
                result.getTotalElements(),
                result.getTotalPages()
        );
    }
    @Transactional
    public void unfriend(
            Long currentUserId,
            Long friendId
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (friendId == null || friendId <= 0) {
            throw new IllegalArgumentException(
                    "friendId khong hop le"
            );
        }

        if (currentUserId.equals(friendId)) {
            throw new IllegalArgumentException(
                    "Khong the huy ket ban voi chinh minh"
            );
        }

        String pairKey = buildPairKey(
                currentUserId,
                friendId
        );

        Friendship friendship =
                friendshipRepository.findByPairKey(pairKey)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Hai user khong co quan he ban be"
                                )
                        );

        if (friendship.getStatus()
                != Friendship.FriendshipStatus.ACCEPTED) {

            throw new IllegalArgumentException(
                    "Hai user chua phai ban be"
            );
        }

        friendshipRepository.delete(friendship);
    }
    public FriendStatusResponse getFriendStatus(
            Long currentUserId,
            Long targetUserId
    ) {

        if (currentUserId == null || currentUserId <= 0) {

            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (targetUserId == null || targetUserId <= 0) {

            throw new IllegalArgumentException(
                    "userId khong hop le"
            );
        }

        /*
         * Xem chính mình
         */
        if (currentUserId.equals(targetUserId)) {

            return new FriendStatusResponse(
                    targetUserId,
                    FriendRelationshipStatus.SELF,
                    null
            );
        }

        /*
         * Kiểm tra target user có thật không
         */
        if (!userRepository.existsById(targetUserId)) {

            throw new IllegalArgumentException(
                    "Khong tim thay user"
            );
        }

        String pairKey = buildPairKey(
                currentUserId,
                targetUserId
        );

        Friendship friendship =
                friendshipRepository
                        .findByPairKey(pairKey)
                        .orElse(null);

        /*
         * Chưa từng có quan hệ
         */
        if (friendship == null) {

            return new FriendStatusResponse(
                    targetUserId,
                    FriendRelationshipStatus.NONE,
                    null
            );
        }

        /*
         * Đã là bạn bè
         */
        if (friendship.getStatus()
                == Friendship.FriendshipStatus.ACCEPTED) {

            return new FriendStatusResponse(
                    targetUserId,
                    FriendRelationshipStatus.FRIEND,
                    friendship.getId()
            );
        }

        /*
         * Request đang pending
         */
        if (friendship.getStatus()
                == Friendship.FriendshipStatus.PENDING) {

            /*
             * Tôi là người gửi
             */
            if (friendship.getRequester()
                    .getId()
                    .equals(currentUserId)) {

                return new FriendStatusResponse(
                        targetUserId,
                        FriendRelationshipStatus.PENDING_SENT,
                        friendship.getId()
                );
            }

            /*
             * Tôi là người nhận
             */
            return new FriendStatusResponse(
                    targetUserId,
                    FriendRelationshipStatus.PENDING_RECEIVED,
                    friendship.getId()
            );
        }

        /*
         * REJECTED
         * coi như hiện tại không có quan hệ
         */
        return new FriendStatusResponse(
                targetUserId,
                FriendRelationshipStatus.NONE,
                null
        );
    }
    public FriendRequestListResponse getSentRequests(
            Long currentUserId,
            int page,
            int limit
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
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

        PageRequest pageable = PageRequest.of(
                page,
                limit,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );

        Page<Friendship> result =
                friendshipRepository
                        .findByRequester_IdAndStatus(
                                currentUserId,
                                Friendship.FriendshipStatus.PENDING,
                                pageable
                        );

        var items = result.getContent()
                .stream()
                .map(friendship ->
                        new FriendRequestItemResponse(
                                friendship.getId(),

                                friendship.getReceiver().getId(),

                                friendship.getReceiver()
                                        .getUserName(),

                                friendship.getReceiver()
                                        .getAvatarUrl(),

                                friendship.getCreatedAt()
                        )
                )
                .toList();

        return new FriendRequestListResponse(
                items,
                page,
                limit,
                result.getTotalElements(),
                result.getTotalPages()
        );
    }
    @Transactional
    public void cancelFriendRequest(
            Long currentUserId,
            Long requestId
    ) {

        if (currentUserId == null || currentUserId <= 0) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (requestId == null || requestId <= 0) {
            throw new IllegalArgumentException(
                    "requestId khong hop le"
            );
        }

        Friendship friendship =
                friendshipRepository.findById(requestId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay loi moi ket ban"
                                )
                        );

        // Chỉ người gửi mới được thu hồi
        if (!friendship.getRequester()
                .getId()
                .equals(currentUserId)) {

            throw new IllegalArgumentException(
                    "Ban khong co quyen thu hoi loi moi nay"
            );
        }

        // Chỉ PENDING mới được cancel
        if (friendship.getStatus()
                != Friendship.FriendshipStatus.PENDING) {

            throw new IllegalArgumentException(
                    "Loi moi ket ban da duoc xu ly"
            );
        }

        friendshipRepository.delete(friendship);
    }
    public FriendListResponse getUserFriends(
            Long userId,
            int page,
            int limit
    ) {

        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException(
                    "userId khong hop le"
            );
        }

        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException(
                    "Khong tim thay user"
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

        PageRequest pageable = PageRequest.of(
                page,
                limit,
                Sort.by(
                        Sort.Direction.DESC,
                        "updatedAt"
                )
        );

        Page<Friendship> result =
                friendshipRepository.findFriends(
                        userId,
                        Friendship.FriendshipStatus.ACCEPTED,
                        pageable
                );

        var items = result.getContent()
                .stream()
                .map(friendship -> {

                    User friend;

                    if (friendship.getRequester()
                            .getId()
                            .equals(userId)) {

                        friend = friendship.getReceiver();

                    } else {

                        friend = friendship.getRequester();
                    }

                    return new FriendItemResponse(
                            friend.getId(),
                            friend.getUserName(),
                            friend.getAvatarUrl(),
                            friend.getBio(),
                            friendship.getUpdatedAt()
                    );
                })
                .toList();

        return new FriendListResponse(
                items,
                page,
                limit,
                result.getTotalElements(),
                result.getTotalPages()
        );
    }
}

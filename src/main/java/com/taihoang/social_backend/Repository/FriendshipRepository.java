package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Friendship;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface FriendshipRepository
        extends JpaRepository<Friendship, Long> {

    Optional<Friendship> findByPairKey(String pairKey);
    Page<Friendship> findByReceiver_IdAndStatus(
            Long receiverId,
            Friendship.FriendshipStatus status,
            Pageable pageable
    );
    Page<Friendship> findByRequester_IdAndStatus(
            Long requesterId,
            Friendship.FriendshipStatus status,
            Pageable pageable
    );
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
       select f
       from Friendship f
       where f.id = :id
       """)
    Optional<Friendship> findByIdForUpdate(
            @Param("id") Long id
    );
    @Query("""
       select f
       from Friendship f
       where f.status = :status
         and (
              f.requester.id = :userId
              or f.receiver.id = :userId
         )
       """)
    Page<Friendship> findFriends(
            @Param("userId") Long userId,
            @Param("status")
            Friendship.FriendshipStatus status,
            Pageable pageable
    );
}
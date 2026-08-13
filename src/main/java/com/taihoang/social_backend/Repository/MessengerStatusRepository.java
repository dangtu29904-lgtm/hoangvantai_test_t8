package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.MessengerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface MessengerStatusRepository extends JpaRepository<MessengerStatus, Long> {
    Optional<MessengerStatus> findByMessengerIdAndUserId(Long messengerId, Long userId);

    @Query("""
            select ms
            from MessengerStatus ms
            where ms.user.id = :userId
              and ms.messenger.conversation.id = :conversationId
              and ms.seenAt is null
            """)
    List<MessengerStatus> findUnseenByConversationIdAndUserId(Long conversationId, Long userId);
}

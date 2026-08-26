package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.MessengerStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessengerStatusRepository extends JpaRepository<MessengerStatus, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<MessengerStatus> findByMessengerIdAndUserId(Long messengerId, Long userId);

    @Query("""
            select ms
            from MessengerStatus ms
            where ms.user.id = :userId
              and ms.messenger.conversation.id = :conversationId
              and ms.seenAt is null
            """)
    List<MessengerStatus> findUnseenByConversationIdAndUserId(Long conversationId, Long userId);

    @Query("""
            select ms.messenger.conversation.id as conversationId,
                   count(ms) as unreadCount
            from MessengerStatus ms
            where ms.user.id = :userId
              and ms.seenAt is null
              and ms.messenger.recalledAt is null
              and ms.messenger.conversation.id in :conversationIds
              and not exists (             
                  select mus.id              
                  from MessageUserState mus              
                  where mus.messenger.id =
                        ms.messenger.id             
                    and mus.user.id = :userId           
                    and mus.deletedAt is not null
              )
            group by ms.messenger.conversation.id
            """)
    List<ConversationUnreadCountView> countUnreadByConversationIds(
            @Param("userId") Long userId,
            @Param("conversationIds") List<Long> conversationIds
    );
    @Query("""
        select ms
        from MessengerStatus ms
        join fetch ms.messenger m
        join fetch m.user
        where ms.user.id = :userId
          and ms.deliveredAt is null
          and (:afterMessageId is null or m.id > :afterMessageId)
          and not exists (
                      select mus.id         
                      from MessageUserState mus          
                      where mus.messenger.id = m.id         
                        and mus.user.id = :userId        
                        and mus.deletedAt is not null
                )
        order by m.id asc
        """)
    List<MessengerStatus> findUndeliveredMessagesForSync(
            @Param("userId") Long userId,
            @Param("afterMessageId") Long afterMessageId,
            Pageable pageable
    );
    interface ConversationUnreadCountView {
        Long getConversationId();

        Long getUnreadCount();
    }
}

package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Conversations;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversations, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Conversations c where c.id = :id")
    Optional<Conversations> findByIdForUpdate(@Param("id") Long id);
    @Query("""
            select c
            from Conversations c
            where c.type = :type
              and (select count(cm)
                   from Conversation_Member cm
                   where cm.conversation = c) = 2
              and exists (select cm1.id
                          from Conversation_Member cm1
                          where cm1.conversation = c
                            and cm1.user.id = :firstUserId)
              and exists (select cm2.id
                          from Conversation_Member cm2
                          where cm2.conversation = c
                            and cm2.user.id = :secondUserId)
            order by c.id asc
            """)
    List<Conversations> findDirectConversations(
            @Param("type") Conversations.type_chat type,
            @Param("firstUserId") Long firstUserId,
            @Param("secondUserId") Long secondUserId,
            Pageable pageable
    );
}

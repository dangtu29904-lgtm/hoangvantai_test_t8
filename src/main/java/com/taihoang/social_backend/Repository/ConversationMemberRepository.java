package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Conversation_Member;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConversationMemberRepository extends JpaRepository<Conversation_Member, Long> {
    boolean existsByConversationIdAndUserId(Long conversationId, Long userId);

    @Query("""
            select cm
            from Conversation_Member cm
            join fetch cm.user
            where cm.conversation.id = :conversationId
              and cm.user.id <> :senderId
            """)
    List<Conversation_Member> findRecipientsByConversationId(
            @Param("conversationId") Long conversationId,
            @Param("senderId") Long senderId
    );
}

package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Conversation_Member;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationMemberRepository extends JpaRepository<Conversation_Member, Long> {
    boolean existsByConversationIdAndUserId(Long conversationId, Long userId);
    Optional<Conversation_Member> findByConversationIdAndUserId(
            Long conversationId,
            Long userId
    );
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

//    sắp xếp hội thoại theo từ conversation có messageId cao đến conversation có message Id  thấp , vì messageId càng cao thì tin nhắn càng mới , và càng thấp thì tin nhắn càng cũ , cái cusor là cái lưu messageId cũ của trang trước , thực hiện việc
//    so sánh với messgaeId này , sau đó sinh ra cái thông tin chat cho trang này
    @Query(value = """
            select cm.conversation_id as conversationId,
                   coalesce(max(m.id), 0) as lastMessageId
            from conversation_member cm
            left join messenger m on m.conversation_id = cm.conversation_id
            where cm.user_id = :userId
            group by cm.conversation_id
            having :cursorLastMessageId is null
                or coalesce(max(m.id), 0) < :cursorLastMessageId
                or (
                    coalesce(max(m.id), 0) = :cursorLastMessageId
                    and cm.conversation_id < :cursorConversationId
                )
            order by coalesce(max(m.id), 0) desc, cm.conversation_id desc
            """, nativeQuery = true)
    List<ConversationCursorView> findConversationCursors(
            @Param("userId") Long userId,
            @Param("cursorLastMessageId") Long cursorLastMessageId,
            @Param("cursorConversationId") Long cursorConversationId,
            Pageable pageable
    );

    @Query("""
            select cm
            from Conversation_Member cm
            join fetch cm.user
            where cm.conversation.id in :conversationIds
            """)
    List<Conversation_Member> findMembersByConversationIds(
            @Param("conversationIds") List<Long> conversationIds
    );
    @Query("""
            select cm
            from Conversation_Member cm
            join fetch cm.user
            where cm.conversation.id = :conversationId
            order by cm.id asc
            """)
    List<Conversation_Member> findMembersByConversationId(
            @Param("conversationId") Long conversationId
    );

    @Query("""
            select distinct u.email
            from Conversation_Member cm
            join cm.conversation c
            join c.conversationMembers cm2
            join cm2.user u
            where cm.user.id = :userId
              and u.id <> :userId
            """)
    List<String> findPresenceRecipientDestinations(@Param("userId") Long userId);
    interface ConversationCursorView {
        Long getConversationId();

        Long getLastMessageId();
    }
}

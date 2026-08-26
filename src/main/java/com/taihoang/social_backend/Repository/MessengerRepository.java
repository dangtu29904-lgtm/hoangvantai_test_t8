package com.taihoang.social_backend.Repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.taihoang.social_backend.Entity.Messenger;

public interface MessengerRepository extends JpaRepository<Messenger, Long> {
    @Query("""
            select m
            from Messenger m
            where m.conversation.id = :conversationId
              and m.user.id = :userId
              and m.clientMessageId = :clientMessageId
            """)
    Optional<Messenger> findByConversationIdAndUserIdAndClientMessageId(
            @Param("conversationId")
            Long conversationId,
            @Param("userId")
            Long userId,
            @Param("clientMessageId")
            String clientMessageId
    );
    // sap xep tin nhan dung thu tu trong phong chat
    @Query("select coalesce(max(m.sequenceNumber), 0) from Messenger m where m.conversation.id = :conversationId")
    Long findMaxSequenceNumberByConversationId(@Param("conversationId") Long conversationId);
    // hien thi lich su chat

    @Query("""
        select m
        from Messenger m
        join fetch m.user
        where m.conversation.id = :conversationId
          and m.sequenceNumber is not null
          and (
                :beforeSequence is null
                or m.sequenceNumber < :beforeSequence
          )
          and not exists (
                select mus.id
                from MessageUserState mus
                where mus.messenger.id = m.id
                  and mus.user.id = :userId
                  and mus.deletedAt is not null
          )
        order by m.sequenceNumber desc
        """)
    List<Messenger> findMessageHistory(
            @Param("conversationId")
            Long conversationId,
            @Param("userId")
            Long userId,
            @Param("beforeSequence")
            Long beforeSequence,
            Pageable pageable
    );
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
       SELECT m
       FROM Messenger m
       WHERE m.id = :messageId
       """)
    Optional<Messenger> findByIdForUpdate(
            @Param("messageId")
            Long messageId
    );

    // ==========================================
    // ADMIN STATISTICS
    // ==========================================

    @Query("SELECT COUNT(m) FROM Messenger m WHERE m.sentAt >= :start AND m.sentAt < :end")
    long countBySentAtBetween(@Param("start") java.time.LocalDateTime start, @Param("end") java.time.LocalDateTime end);

    @Query(value = "SELECT DATE(sent_at) AS date, COUNT(*) AS count FROM messengers WHERE sent_at >= :start AND sent_at < :end GROUP BY DATE(sent_at) ORDER BY DATE(sent_at)", nativeQuery = true)
    java.util.List<com.taihoang.social_backend.dto.statistics.DailyCountProjection> countDailyGrowth(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );

    @Query("SELECT m.user.id AS userId, COUNT(m) AS count FROM Messenger m WHERE m.sentAt >= :start AND m.sentAt < :end GROUP BY m.user.id")
    java.util.List<com.taihoang.social_backend.dto.statistics.UserActivityCountProjection> countActiveUserMessages(
            @Param("start") java.time.LocalDateTime start,
            @Param("end") java.time.LocalDateTime end
    );
}

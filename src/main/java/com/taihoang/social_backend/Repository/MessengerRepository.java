package com.taihoang.social_backend.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.taihoang.social_backend.Entity.Messenger;

public interface MessengerRepository extends JpaRepository<Messenger, Long> {
    Optional<Messenger> findByConversationIdAndClientMessageId(Long conversationId, String clientMessageId);
    // sap xep tin nhan dung thu tu trong phong chat
    @Query("select coalesce(max(m.sequenceNumber), 0) from Messenger m where m.conversation.id = :conversationId")
    Long findMaxSequenceNumberByConversationId(@Param("conversationId") Long conversationId);
}

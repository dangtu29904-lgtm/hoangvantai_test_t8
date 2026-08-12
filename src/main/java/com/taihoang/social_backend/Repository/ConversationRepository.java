package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Conversations;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversations, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Conversations c where c.id = :id")
    Optional<Conversations> findByIdForUpdate(@Param("id") Long id);
}

package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository
        extends JpaRepository<MessageReaction, Long> {


    Optional<MessageReaction>
    findByMessengerIdAndUserId(
            Long messengerId,
            Long userId
    );


    List<MessageReaction>
    findByMessengerId(Long messengerId);
    @Query("""
        select mr
        from MessageReaction mr

        join fetch mr.user

        where mr.messenger.id in :messageIds
        """)
    List<MessageReaction> findByMessageIds(
            @Param("messageIds")
            List<Long> messageIds
    );
}
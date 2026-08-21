package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.MessageUserState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MessageUserStateRepository
        extends JpaRepository<MessageUserState, Long> {

    Optional<MessageUserState>
    findByMessengerIdAndUserId(
            Long messengerId,
            Long userId
    );
}
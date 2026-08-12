package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.MessengerStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MessengerStatusRepository extends JpaRepository<MessengerStatus, Long> {
    Optional<MessengerStatus> findByMessengerIdAndUserId(Long messengerId, Long userId);
}

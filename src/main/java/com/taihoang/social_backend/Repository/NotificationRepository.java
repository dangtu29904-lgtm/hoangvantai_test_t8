package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    Page<Notification> findByReceiver_Id(
            Long receiverId,
            Pageable pageable
    );
    Optional<Notification> findByIdAndReceiver_Id(
            Long notificationId,
            Long receiverId
    );
    @Modifying
    @Query("""
       update Notification n
       set n.read = true
       where n.receiver.id = :receiverId
         and n.read = false
       """)
    int markAllAsRead(
            @Param("receiverId") Long receiverId
    );
    long countByReceiver_IdAndReadFalse(
            Long receiverId
    );
}
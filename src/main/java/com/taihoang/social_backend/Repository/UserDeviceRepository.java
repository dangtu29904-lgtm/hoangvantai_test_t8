package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.UserDevice;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {

    Optional<UserDevice> findByUser_IdAndDeviceId(Long userId, String deviceId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select ud
            from UserDevice ud
            where ud.user.id = :userId
              and ud.deviceId = :deviceId
            """)
    Optional<UserDevice> findByUserIdAndDeviceIdForUpdate(
            @Param("userId") Long userId,
            @Param("deviceId") String deviceId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select ud
            from UserDevice ud
            where ud.id = :deviceId
              and ud.user.id = :userId
            """)
    Optional<UserDevice> findByIdAndUserIdForUpdate(
            @Param("deviceId") Long deviceId,
            @Param("userId") Long userId
    );

    List<UserDevice> findByUser_IdOrderByLastSeenAtDesc(Long userId);
}

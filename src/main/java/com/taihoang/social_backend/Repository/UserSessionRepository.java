package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.UserSession;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select us
            from UserSession us
            join fetch us.user u
            left join fetch us.userDevice ud
            where us.refreshTokenHash = :refreshTokenHash
            """)
    Optional<UserSession> findByRefreshTokenHashForUpdate(
            @Param("refreshTokenHash") String refreshTokenHash
    );

    @Query("""
            select us
            from UserSession us
            join fetch us.user u
            left join fetch us.userDevice ud
            where u.id = :userId
            order by us.lastActiveAt desc, us.id desc
            """)
    List<UserSession> findAllByUserId(@Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select us
            from UserSession us
            join fetch us.user u
            left join fetch us.userDevice ud
            where us.id = :sessionId
              and u.id = :userId
            """)
    Optional<UserSession> findByIdAndUserIdForUpdate(
            @Param("sessionId") Long sessionId,
            @Param("userId") Long userId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select us
            from UserSession us
            join fetch us.user u
            left join fetch us.userDevice ud
            where u.id = :userId
              and us.status = :status
              and us.id <> :currentSessionId
            """)
    List<UserSession> findActiveOtherSessionsForUpdate(
            @Param("userId") Long userId,
            @Param("currentSessionId") Long currentSessionId,
            @Param("status") UserSession.Status status
    );

    @Query("""
            select count(us) > 0
            from UserSession us
            where us.id = :sessionId
              and us.user.id = :userId
              and us.status = :status
              and us.revokedAt is null
              and us.expiresAt > :now
            """)
    boolean existsActiveSession(
            @Param("sessionId") Long sessionId,
            @Param("userId") Long userId,
            @Param("status") UserSession.Status status,
            @Param("now") LocalDateTime now
    );

    @Query("""
            select count(us) > 0
            from UserSession us
            where us.user.id = :userId
              and us.status = :status
              and us.revokedAt is null
              and us.expiresAt > :now
            """)
    boolean existsActiveSessionForUser(
            @Param("userId") Long userId,
            @Param("status") UserSession.Status status,
            @Param("now") LocalDateTime now
    );

    @Query("""
            select count(us) > 0
            from UserSession us
            join us.userDevice ud
            where us.user.id = :userId
              and ud.trusted = true
              and us.status = :status
              and us.revokedAt is null
              and us.expiresAt > :now
            """)
    boolean existsActiveTrustedSessionForUser(
            @Param("userId") Long userId,
            @Param("status") UserSession.Status status,
            @Param("now") LocalDateTime now
    );
}

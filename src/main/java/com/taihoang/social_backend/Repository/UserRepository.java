package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.NativeQuery;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
    @Query(value = "select * from user as u where u.username = :userName",nativeQuery = true)
    Optional<User> findByUserName(@Param("userName") String userName) ;

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);
    @Query("""
       select u
       from User u
       where lower(u.userName) like lower(concat('%', :keyword, '%'))
         and u.id <> :currentUserId
       order by u.userName asc
       """)
    Page<User> searchUsers(
            @Param("keyword") String keyword,
            @Param("currentUserId") Long currentUserId,
            Pageable pageable
    );

    // ==========================================
    // ADMIN STATISTICS
    // ==========================================

    long countByStatus(com.taihoang.social_backend.Entity.UserStatus status);

    @Query("SELECT COUNT(u) FROM User u WHERE u.creatAt >= :start AND u.creatAt < :end")
    long countByCreatedAtBetween(@Param("start") java.time.LocalDate start, @Param("end") java.time.LocalDate end);

    @Query(value = "SELECT create_at AS date, COUNT(*) AS count FROM user WHERE create_at >= :start AND create_at < :end GROUP BY create_at ORDER BY create_at", nativeQuery = true)
    java.util.List<com.taihoang.social_backend.dto.statistics.DailyCountProjection> countDailyGrowth(
            @Param("start") java.time.LocalDate start,
            @Param("end") java.time.LocalDate end
    );
}

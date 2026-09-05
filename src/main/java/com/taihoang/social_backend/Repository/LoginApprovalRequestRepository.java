package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.LoginApprovalRequest;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface LoginApprovalRequestRepository extends JpaRepository<LoginApprovalRequest, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select lar
            from LoginApprovalRequest lar
            join fetch lar.user u
            left join fetch lar.userDevice ud
            where lar.approvalToken = :approvalToken
            """)
    Optional<LoginApprovalRequest> findByApprovalTokenForUpdate(
            @Param("approvalToken") String approvalToken
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select lar
            from LoginApprovalRequest lar
            join fetch lar.user u
            left join fetch lar.userDevice ud
            where lar.id = :id
              and u.id = :userId
            """)
    Optional<LoginApprovalRequest> findByIdAndUserIdForUpdate(
            @Param("id") Long id,
            @Param("userId") Long userId
    );
}

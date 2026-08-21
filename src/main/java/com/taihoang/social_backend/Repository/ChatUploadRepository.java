package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.ChatUpload;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatUploadRepository
        extends JpaRepository<ChatUpload, Long> {

    Optional<ChatUpload>
    findByIdAndUserId(
            Long id,
            Long userId
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select cu
        from ChatUpload cu

        where cu.id in :uploadIds
          and cu.user.id = :userId
        """)
    List<ChatUpload> findOwnedUploadsForUpdate(

            @Param("uploadIds")
            List<Long> uploadIds,

            @Param("userId")
            Long userId
    );
}
package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.MessageAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageAttachmentRepository extends JpaRepository<MessageAttachment,Long> {
    @Query("""
            select ma
            from MessageAttachment ma

            join fetch ma.chatUpload cu

            where ma.messenger.id = :messageId

            order by ma.position asc
            """)
    List<MessageAttachment> findByMessageIdWithUpload(
            @Param("messageId")
            Long messageId
    );
    @Query("""
            select ma
            from MessageAttachment ma

            join fetch ma.chatUpload cu

            where ma.messenger.id in :messageIds

            order by ma.messenger.id asc,
                     ma.position asc
            """)
    List<MessageAttachment> findByMessageIds(
            @Param("messageIds")
            List<Long> messageIds
    );
}

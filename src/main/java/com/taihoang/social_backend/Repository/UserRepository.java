package com.taihoang.social_backend.Repository;

import com.taihoang.social_backend.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.NativeQuery;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
    @Query(value = "select * from user as u where u.username = :userName",nativeQuery = true)
    Optional<User> findByUserName(@Param("userName") String userName) ;

}

package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Entity.UserDevice;
import com.taihoang.social_backend.dto.LoginRequest;

import java.util.Optional;

public interface UserDeviceService {

    UserDevice recordLoginDevice(
            User user,
            LoginRequest request,
            String ipAddress,
            String userAgent
    );

    void updateTrusted(Long userId, Long userDeviceId, boolean trusted);

    Optional<UserDevice> findByBrowserDeviceId(Long userId, String deviceId);
}

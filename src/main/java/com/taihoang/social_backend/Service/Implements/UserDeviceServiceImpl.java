package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Entity.UserDevice;
import com.taihoang.social_backend.Repository.UserDeviceRepository;
import com.taihoang.social_backend.Service.UserDeviceService;
import com.taihoang.social_backend.dto.LoginRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserDeviceServiceImpl implements UserDeviceService {

    private final UserDeviceRepository userDeviceRepository;

    @Override
    @Transactional
    public UserDevice recordLoginDevice(
            User user,
            LoginRequest request,
            String ipAddress,
            String userAgent
    ) {
        if (user == null || user.getId() == null) {
            throw new IllegalArgumentException("User dang nhap khong hop le");
        }

        String deviceId = normalize(request.deviceId(), 128);
        if (deviceId == null) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        var existingDevice = userDeviceRepository.findByUserIdAndDeviceIdForUpdate(user.getId(), deviceId);
        UserDevice device = existingDevice.orElseGet(() -> {
            UserDevice created = new UserDevice();
            created.setUser(user);
            created.setDeviceId(deviceId);
            created.setFirstSeenAt(now);
            created.setTrusted(false);
            return created;
        });

        device.setLastSeenAt(now);
        device.setDeviceName(normalize(request.deviceName(), 160));
        device.setDeviceType(normalize(request.deviceType(), 40));
        device.setBrowser(normalize(request.browser(), 80));
        device.setOs(normalize(request.os(), 80));
        device.setLastIp(normalize(ipAddress, 45));
        device.setUserAgent(normalize(userAgent, 1000));

        UserDevice saved = userDeviceRepository.save(device);
        return saved;
    }

    @Override
    @Transactional
    public void updateTrusted(Long userId, Long userDeviceId, boolean trusted) {
        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("User dang nhap khong hop le");
        }

        if (userDeviceId == null || userDeviceId <= 0) {
            throw new IllegalArgumentException("userDeviceId khong hop le");
        }

        UserDevice device = userDeviceRepository
                .findByIdAndUserIdForUpdate(userDeviceId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay thiet bi"));

        device.setTrusted(trusted);
        userDeviceRepository.save(device);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserDevice> findByBrowserDeviceId(Long userId, String deviceId) {
        String normalizedDeviceId = normalize(deviceId, 128);
        if (userId == null || userId <= 0 || normalizedDeviceId == null) {
            return Optional.empty();
        }

        return userDeviceRepository.findByUser_IdAndDeviceId(userId, normalizedDeviceId);
    }

    private String normalize(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }

        if (trimmed.length() <= maxLength) {
            return trimmed;
        }

        return trimmed.substring(0, maxLength);
    }
}

package com.taihoang.social_backend.Service;

public interface EmailService {

    void sendLoginOtp(String to, String otp);
}

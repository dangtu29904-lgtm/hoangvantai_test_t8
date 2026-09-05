package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:}")
    private String fromAddress;

    @Override
    public void sendLoginOtp(String to, String otp) {
        if (to == null || to.isBlank()) {
            throw new IllegalArgumentException("Email nhan OTP khong hop le");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        if (fromAddress != null && !fromAddress.isBlank()) {
            message.setFrom(fromAddress);
        }
        message.setTo(to);
        message.setSubject("Ma xac minh dang nhap Socially");
        message.setText("""
                Xin chao,

                Ma OTP dang nhap cua ban la: %s

                Ma nay se het han sau vai phut. Neu ban khong thuc hien dang nhap, hay bo qua email nay va kiem tra bao mat tai khoan.
                """.formatted(otp));

        mailSender.send(message);
    }
}

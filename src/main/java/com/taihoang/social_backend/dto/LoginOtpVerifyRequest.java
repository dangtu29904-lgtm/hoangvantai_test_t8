package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record LoginOtpVerifyRequest(
        @NotBlank(message = "OTP khong duoc de trong")
        @Pattern(regexp = "\\d{6}", message = "OTP phai gom 6 chu so")
        String otp,

        Boolean trustDevice
) {
}

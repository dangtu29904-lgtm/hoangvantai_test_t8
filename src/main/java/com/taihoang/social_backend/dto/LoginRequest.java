package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @Email(message = "Email khong hop le")
        @NotBlank(message = "Email khong duoc de trong")
        String email,

        @NotBlank(message = "Password khong duoc de trong")
        String password,

        @Size(max = 128, message = "deviceId khong duoc vuot qua 128 ky tu")
        String deviceId,

        @Size(max = 160, message = "deviceName khong duoc vuot qua 160 ky tu")
        String deviceName,

        @Size(max = 40, message = "deviceType khong duoc vuot qua 40 ky tu")
        String deviceType,

        @Size(max = 80, message = "browser khong duoc vuot qua 80 ky tu")
        String browser,

        @Size(max = 80, message = "os khong duoc vuot qua 80 ky tu")
        String os
) {
}

package com.taihoang.social_backend.dto;

public record DeliveredResult(
        String senderDestination,
        DeliveredResponse response
) {
}

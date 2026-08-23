package com.taihoang.social_backend.dto;

import java.util.List;

public record SystemMessageResult(

        MessageResponse message,

        List<String> destinations

) {
}
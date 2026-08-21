package com.taihoang.social_backend.dto;

import java.util.List;

public record RecallMessageResult(

        RecallMessageResponse response,

        List<String> destinations

) {
}
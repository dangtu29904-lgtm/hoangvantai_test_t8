package com.taihoang.social_backend.dto;

import java.util.List;

public record EditMessageResult(

        EditMessageResponse response,

        List<String> destinations

) {
}
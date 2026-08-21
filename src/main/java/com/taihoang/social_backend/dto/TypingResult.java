package com.taihoang.social_backend.dto;

import java.util.List;

public record TypingResult(

        TypingResponse response,

        List<String> recipientDestinations

) {
}
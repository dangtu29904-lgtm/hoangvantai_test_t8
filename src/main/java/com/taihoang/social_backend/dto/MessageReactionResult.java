package com.taihoang.social_backend.dto;

import java.util.List;

public record MessageReactionResult(

        MessageReactionResponse response,

        List<String> destinations

) {
}
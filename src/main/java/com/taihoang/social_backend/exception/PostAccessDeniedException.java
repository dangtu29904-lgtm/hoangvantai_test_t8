package com.taihoang.social_backend.exception;

public class PostAccessDeniedException
        extends RuntimeException {

    public PostAccessDeniedException(
            String message
    ) {
        super(message);
    }
}
package com.taihoang.social_backend.configure;

import com.taihoang.social_backend.dto.ChatErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.ControllerAdvice;

import java.time.Instant;
import java.util.stream.Collectors;

@ControllerAdvice
public class WebSocketExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(WebSocketExceptionHandler.class);

    @MessageExceptionHandler(MethodArgumentNotValidException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ChatErrorResponse handleValidationError(MethodArgumentNotValidException exception) {
        BindingResult bindingResult = exception.getBindingResult();
        String message = bindingResult == null
                ? ""
                : bindingResult.getFieldErrors()
                .stream()
                .map(fieldError -> fieldError.getDefaultMessage() == null
                                   ? fieldError.getField() + " khong hop le"
                                   : fieldError.getDefaultMessage())
                .distinct()
                .collect(Collectors.joining(", "));

        if (message.isBlank()) {
            message = "Du lieu gui len khong hop le";
        }

        return createError("VALIDATION_ERROR", message);
    }

    @MessageExceptionHandler(IllegalArgumentException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ChatErrorResponse handleIllegalArgument(IllegalArgumentException exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = "Yeu cau chat khong hop le";
        }

        return createError("CHAT_REQUEST_FAILED", message);
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ChatErrorResponse handleUnexpectedError(Exception exception) {
        LOGGER.error("Unexpected WebSocket message handling error", exception);
        return createError("INTERNAL_ERROR", "Co loi xay ra khi xu ly yeu cau chat");
    }

    private ChatErrorResponse createError(String code, String message) {
        return new ChatErrorResponse(code, message, Instant.now());
    }
}

package com.taihoang.social_backend.Controllers;

import com.taihoang.social_backend.Service.ChatUploadService;
import com.taihoang.social_backend.dto.ChatUploadResponse;
import com.taihoang.social_backend.security.AuthenticatedUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/user/chat/uploads")
@RequiredArgsConstructor
public class ChatUploadController {

    private final ChatUploadService
            chatUploadService;


    @PostMapping
    public ResponseEntity<ChatUploadResponse> upload(

            @RequestParam("file")
            MultipartFile file,

            Authentication authentication
    ) {

        AuthenticatedUserDetails userDetails =
                (AuthenticatedUserDetails)
                        authentication
                                .getPrincipal();


        ChatUploadResponse response =
                chatUploadService.upload(

                        userDetails.getId(),

                        file
                );


        return ResponseEntity.ok(
                response
        );
    }
}
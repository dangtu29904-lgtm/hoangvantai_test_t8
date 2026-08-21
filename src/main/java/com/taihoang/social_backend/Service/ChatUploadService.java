package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.ChatUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface ChatUploadService {
    public ChatUploadResponse upload(Long currentUserId , MultipartFile file) ;
}

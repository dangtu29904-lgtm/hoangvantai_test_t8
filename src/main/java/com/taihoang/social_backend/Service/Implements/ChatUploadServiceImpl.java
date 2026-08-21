package com.taihoang.social_backend.Service.Implements;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.taihoang.social_backend.Entity.AttachmentType;
import com.taihoang.social_backend.Entity.ChatUpload;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.ChatUploadRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.ChatUploadService;
import com.taihoang.social_backend.dto.ChatUploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatUploadServiceImpl implements ChatUploadService {
    private final Cloudinary cloudinary  ;
    private final UserRepository userRepository ;
    private final ChatUploadRepository chatUploadRepository ;
    private static final long MAX_IMAGE_SIZE =
            10L * 1024 * 1024;

    private static final long MAX_VIDEO_SIZE =
            50L * 1024 * 1024;

    private static final long MAX_FILE_SIZE =
            20L * 1024 * 1024;
    private AttachmentType resolveAttachmentType(
            MultipartFile file
    ) {

        String contentType =
                file.getContentType();


        if (contentType == null) {

            throw new IllegalArgumentException(
                    "Khong xac dinh duoc loai file"
            );
        }


        if (contentType.startsWith("image/")) {

            return AttachmentType.IMAGE;
        }


        if (contentType.startsWith("video/")) {

            return AttachmentType.VIDEO;
        }


        return AttachmentType.FILE;
    }
    private void validateFileSize(
            MultipartFile file,
            AttachmentType type
    ) {

        long size =
                file.getSize();


        switch (type) {

            case IMAGE -> {

                if (size > MAX_IMAGE_SIZE) {

                    throw new IllegalArgumentException(
                            "Anh khong duoc vuot qua 10MB"
                    );
                }
            }


            case VIDEO -> {

                if (size > MAX_VIDEO_SIZE) {

                    throw new IllegalArgumentException(
                            "Video khong duoc vuot qua 50MB"
                    );
                }
            }


            case FILE -> {

                if (size > MAX_FILE_SIZE) {

                    throw new IllegalArgumentException(
                            "File khong duoc vuot qua 20MB"
                    );
                }
            }
        }
    }
    private Map uploadToCloudinary(
            MultipartFile file,
            AttachmentType type
    ) {

        try {

            String resourceType =
                    type == AttachmentType.IMAGE
                            ? "image"
                            : type == AttachmentType.VIDEO
                              ? "video"
                              : "raw";


            return cloudinary
                    .uploader()
                    .upload(
                            file.getBytes(),

                            ObjectUtils.asMap(

                                    "folder",
                                    "social-chat",

                                    "resource_type",
                                    resourceType
                            )
                    );

        } catch (IOException e) {

            throw new IllegalStateException(
                    "Upload file that bai",
                    e
            );
        }
    }
    @Override
    @Transactional
    public ChatUploadResponse upload(
            Long currentUserId,
            MultipartFile file
    ) {

        // ===============================
        // 1. CHECK USER
        // ===============================

        User currentUser =
                userRepository
                        .findById(currentUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay user"
                                )
                        );


        // ===============================
        // 2. CHECK FILE
        // ===============================

        if (file == null || file.isEmpty()) {

            throw new IllegalArgumentException(
                    "File khong duoc de trong"
            );
        }


        // ===============================
        // 3. XAC DINH TYPE
        // ===============================

        AttachmentType type =
                resolveAttachmentType(file);


        // ===============================
        // 4. VALIDATE SIZE
        // ===============================

        validateFileSize(
                file,
                type
        );


        // ===============================
        // 5. UPLOAD CLOUDINARY
        // ===============================

        Map uploadResult =
                uploadToCloudinary(
                        file,
                        type
                );


        String publicId =
                uploadResult
                        .get("public_id")
                        .toString();


        String secureUrl =
                uploadResult
                        .get("secure_url")
                        .toString();


        // ===============================
        // 6. SAVE METADATA
        // ===============================

        ChatUpload chatUpload =
                new ChatUpload();


        chatUpload.setUser(
                currentUser
        );

        chatUpload.setAttachmentType(
                type
        );

        chatUpload.setPublicId(
                publicId
        );

        chatUpload.setSecureUrl(
                secureUrl
        );

        chatUpload.setOriginalFileName(
                file.getOriginalFilename()
        );

        chatUpload.setContentType(
                file.getContentType()
        );

        chatUpload.setFileSize(
                file.getSize()
        );


        ChatUpload saved =
                chatUploadRepository
                        .save(chatUpload);


        // ===============================
        // 7. RESPONSE
        // ===============================

        return new ChatUploadResponse(

                saved.getId(),

                saved.getAttachmentType(),

                saved.getSecureUrl(),

                saved.getOriginalFileName(),

                saved.getContentType(),

                saved.getFileSize()
        );
    }
}

package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.dto.ConversationDetailResponse;

public interface ConversationDetailService {

    ConversationDetailResponse getConversationDetail(
            Long currentUserId,
            Long conversationId
    );
}

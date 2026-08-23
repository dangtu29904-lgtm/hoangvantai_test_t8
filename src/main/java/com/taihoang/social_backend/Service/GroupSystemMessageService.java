package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.MessageType;
import com.taihoang.social_backend.dto.SystemMessageResult;

public interface GroupSystemMessageService {
    SystemMessageResult createSystemMessage(Long conversationId , Long actorUserId , MessageType messageType , String content)  ;
}

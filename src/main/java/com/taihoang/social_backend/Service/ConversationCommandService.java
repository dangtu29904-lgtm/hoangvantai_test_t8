package com.taihoang.social_backend.Service;

import com.taihoang.social_backend.Entity.Conversation_Member;
import com.taihoang.social_backend.dto.*;

import java.util.List;

public interface ConversationCommandService {
    DirectConversationResponse createDirectConversation(
            Long currentUserId,
            Long recipientId
    );
    GroupConversationResponse createGroupConversation(
            Long currentUserId,
            String name,
            List<Long> memberIds
    );
    GroupConversationResponse addGroupMembers(Long currentUserId , Long conversationId , List<Long> MemberIds)  ;
    void removeGroupMember(Long currentUserId ,Long conversationId , Long memberId)  ;
    public void leaveGroup(Long currentUserId , Long conversationId)  ;
    public GroupConversationResponse updateGroupName(Long currentUserId , Long conversationId , String name)  ;
    public GroupMemberResponse updateGroupMemberRole(Long currentUserId , Long conversationId , Long memberId , Conversation_Member.MemberRole role )  ;
    public GroupAvatarResponse updateGroupAvatar(Long currentUserId , Long conversationId ,Long uploadId)  ;
}

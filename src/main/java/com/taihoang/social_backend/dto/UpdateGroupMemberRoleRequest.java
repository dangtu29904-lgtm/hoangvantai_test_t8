package com.taihoang.social_backend.dto;

import com.taihoang.social_backend.Entity.Conversation_Member;
import jakarta.validation.constraints.NotNull;

public record UpdateGroupMemberRoleRequest(

        @NotNull(message = "role khong duoc de trong")
        Conversation_Member.MemberRole role

) {
}
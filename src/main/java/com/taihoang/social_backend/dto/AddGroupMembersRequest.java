package com.taihoang.social_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AddGroupMembersRequest(

        @NotNull(message = "memberIds khong duoc de trong")
        @Size(
                min = 1,
                max = 99,
                message = "Danh sach thanh vien phai co tu 1 den 99 user"
        )
        List<
                @NotNull(message = "memberId khong duoc null")
                @Positive(message = "memberId phai lon hon 0")
                        Long
                > memberIds

) {
}
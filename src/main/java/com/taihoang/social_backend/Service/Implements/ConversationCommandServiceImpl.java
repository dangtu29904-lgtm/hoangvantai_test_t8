package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.Conversation_Member;
import com.taihoang.social_backend.Entity.Conversations;
import com.taihoang.social_backend.Entity.User;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.ConversationRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.ConversationCommandService;
import com.taihoang.social_backend.Service.ConversationQueryService;
import com.taihoang.social_backend.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationCommandServiceImpl implements ConversationCommandService {
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;

    /**
     * Tao conversation 1-1 hoac tra lai conversation da ton tai.
     */
    @Override
    @Transactional
    public DirectConversationResponse createDirectConversation(
            Long currentUserId,
            Long recipientId
    ) {
        validateRequest(currentUserId, recipientId);

        LockedUsers lockedUsers = lockUsersInFixedOrder(currentUserId, recipientId);
        User currentUser = lockedUsers.findById(currentUserId);
        User recipient = lockedUsers.findById(recipientId);

        Conversations existingConversation = findExistingConversation(
                currentUserId,
                recipientId
        );
        if (existingConversation != null) {
            return toResponse(existingConversation, currentUser, recipient, false);
        }

        Conversations newConversation = createConversation();
        createMembers(newConversation, currentUser, recipient);

        return toResponse(newConversation, currentUser, recipient, true);
    }




    private void validateRequest(Long currentUserId, Long recipientId) {
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException("User dang nhap khong hop le");
        }
        if (recipientId == null || recipientId < 1) {
            throw new IllegalArgumentException("recipientId khong hop le");
        }
        if (currentUserId.equals(recipientId)) {
            throw new IllegalArgumentException("Khong the tao conversation voi chinh minh");
        }
    }

    /**
     * Khoa hai user theo id tang dan de hai request dong thoi khong tao hai phong chat trung nhau.
     */
    private LockedUsers lockUsersInFixedOrder(Long currentUserId, Long recipientId) {
        Long firstId = Math.min(currentUserId, recipientId);
        Long secondId = Math.max(currentUserId, recipientId);

        User firstUser = userRepository.findByIdForUpdate(firstId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay user " + firstId));
        User secondUser = userRepository.findByIdForUpdate(secondId)
                .orElseThrow(() -> new IllegalArgumentException("Khong tim thay user " + secondId));

        return new LockedUsers(firstUser, secondUser);
    }

    private Conversations findExistingConversation(Long currentUserId, Long recipientId) {
        List<Conversations> conversations = conversationRepository.findDirectConversations(
                Conversations.type_chat.private_chat,
                currentUserId,
                recipientId,
                PageRequest.of(0, 1)
        );
        return conversations.isEmpty() ? null : conversations.get(0);
    }

    private Conversations createConversation() {
        Conversations conversation = new Conversations();
        conversation.setType(Conversations.type_chat.private_chat);
        conversation.setCreateAt(LocalDate.now());
        return conversationRepository.save(conversation);
    }

    private void createMembers(
            Conversations conversation,
            User currentUser,
            User recipient
    ) {
        LocalDate joinedAt = LocalDate.now();
        Conversation_Member currentMember = createMember(conversation, currentUser, joinedAt);
        Conversation_Member recipientMember = createMember(conversation, recipient, joinedAt);
        conversationMemberRepository.saveAll(List.of(currentMember, recipientMember));
    }

    private Conversation_Member createMember(
            Conversations conversation,
            User user,
            LocalDate joinedAt
    ) {
        Conversation_Member member = new Conversation_Member();
        member.setConversation(conversation);
        member.setUser(user);
        member.setJoinAt(joinedAt);
        return member;
    }

    private DirectConversationResponse toResponse(
            Conversations conversation,
            User currentUser,
            User recipient,
            boolean created
    ) {
        return new DirectConversationResponse(
                conversation.getId(),
                conversation.getType(),
                conversation.getCreateAt(),
                List.of(toMemberResponse(currentUser), toMemberResponse(recipient)),
                created
        );
    }

    private ConversationMemberResponse toMemberResponse(User user) {
        return new ConversationMemberResponse(
                user.getId(),
                user.getUserName(),
                user.getEmail()
        );
    }
    private record LockedUsers(User firstUser, User secondUser) {
        private User findById(Long userId) {
            if (firstUser.getId().equals(userId)) {
                return firstUser;
            }
            if (secondUser.getId().equals(userId)) {
                return secondUser;
            }
            throw new IllegalArgumentException("User khong nam trong danh sach da khoa");
        }
    }
    @Override
    @Transactional
    public GroupConversationResponse createGroupConversation(
            Long currentUserId,
            String name,
            List<Long> memberIds
    ) {
        String normalizedName =
                validateAndNormalizeGroupName(name);

        List<Long> normalizedMemberIds =
                normalizeMemberIds(currentUserId, memberIds);

        List<User> orderedUsers =
                loadGroupUsers(currentUserId, normalizedMemberIds);

        Conversations conversation =
                createGroup(normalizedName);

        List<Conversation_Member> members =
                createGroupMembers(conversation, orderedUsers);

        conversationMemberRepository.saveAll(members);

        return toResponse(conversation, members);
    }
    private String validateAndNormalizeGroupName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Ten nhom khong duoc de trong");
        }

        String normalizedName = name.trim();
        if (normalizedName.length() > 100) {
            throw new IllegalArgumentException("Ten nhom khong duoc vuot qua 100 ky tu");
        }
        return normalizedName;
    }

    /**
     * Loai id cua creator va loai id trung nhau, nhung van giu thu tu ban dau.
     */
    private List<Long> normalizeMemberIds(Long currentUserId, List<Long> memberIds) {
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException("User dang nhap khong hop le");
        }
        if (memberIds == null) {
            throw new IllegalArgumentException("memberIds khong duoc de trong");
        }

        LinkedHashSet<Long> uniqueMemberIds = new LinkedHashSet<>();
        for (Long memberId : memberIds) {
            if (memberId == null || memberId < 1) {
                throw new IllegalArgumentException("memberId khong hop le");
            }
            if (!memberId.equals(currentUserId)) {
                uniqueMemberIds.add(memberId);
            }
        }

        if (uniqueMemberIds.isEmpty()) {
            throw new IllegalArgumentException("Nhom phai co it nhat mot thanh vien khac");
        }
        if (uniqueMemberIds.size() > 99) {
            throw new IllegalArgumentException("Nhom khong duoc vuot qua 100 thanh vien");
        }
        return new ArrayList<>(uniqueMemberIds);
    }

    /**
     * Kiem tra creator va tat ca memberId deu ton tai trong database.
     */
    private List<User> loadGroupUsers(Long currentUserId, List<Long> memberIds) {
        List<Long> orderedUserIds = new ArrayList<>();
        orderedUserIds.add(currentUserId);
        orderedUserIds.addAll(memberIds);

        Map<Long, User> usersById = userRepository.findAllById(orderedUserIds)
                .stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<Long> missingUserIds = orderedUserIds.stream()
                .filter(userId -> !usersById.containsKey(userId))
                .toList();
        if (!missingUserIds.isEmpty()) {
            throw new IllegalArgumentException("Khong tim thay user: " + missingUserIds);
        }

        return orderedUserIds.stream()
                .map(usersById::get)
                .toList();
    }

    private Conversations createGroup(String name) {
        Conversations conversation = new Conversations();
        conversation.setType(Conversations.type_chat.groups_chat);
        conversation.setName(name);
        conversation.setCreateAt(LocalDate.now());
        return conversationRepository.save(conversation);
    }

    /**
     * Phan tu dau tien la creator nen co role ADMIN; nhung user con lai la MEMBER.
     */
    private List<Conversation_Member> createGroupMembers(
            Conversations conversation,
            List<User> orderedUsers
    ) {
        List<Conversation_Member> members = new ArrayList<>();

        for (int index = 0; index < orderedUsers.size(); index++) {
            Conversation_Member.MemberRole role = index == 0
                    ? Conversation_Member.MemberRole.ADMIN
                    : Conversation_Member.MemberRole.MEMBER;

            members.add(createMember(conversation, orderedUsers.get(index), role));
        }
        return members;
    }

    private Conversation_Member createMember(
            Conversations conversation,
            User user,
            Conversation_Member.MemberRole role
    ) {
        Conversation_Member member = new Conversation_Member();
        member.setConversation(conversation);
        member.setUser(user);
        member.setJoinAt(LocalDate.now());
        member.setMemberRole(role);
        return member;
    }

    private GroupConversationResponse toResponse(
            Conversations conversation,
            List<Conversation_Member> members
    ) {
        return new GroupConversationResponse(
                conversation.getId(),
                conversation.getType(),
                conversation.getName(),
                conversation.getCreateAt(),
                members.stream()
                        .map(this::toMemberResponse)
                        .toList()
        );
    }

    private GroupMemberResponse toMemberResponse(Conversation_Member member) {
        return new GroupMemberResponse(
                member.getUser().getId(),
                member.getUser().getUserName(),
                member.getUser().getEmail(),
                member.getMemberRole()
        );
    }
}

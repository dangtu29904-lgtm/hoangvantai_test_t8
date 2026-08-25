package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.ChatUploadRepository;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.ConversationRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.ConversationCommandService;
import com.taihoang.social_backend.Service.ConversationQueryService;
import com.taihoang.social_backend.Service.GroupSystemMessageService;
import com.taihoang.social_backend.dto.*;
import com.taihoang.social_backend.event.GroupRealtimePublishEvent;
import com.taihoang.social_backend.event.SystemMessageRealtimeEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationCommandServiceImpl implements ConversationCommandService {
    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final ConversationMemberRepository conversationMemberRepository;
    private final ChatUploadRepository chatUploadRepository ;
    private final ApplicationEventPublisher eventPublisher  ;
    private final GroupSystemMessageService groupSystemMessageService;
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
    @Override
    @Transactional
    public GroupConversationResponse addGroupMembers(
            Long currentUserId,
            Long conversationId,
            List<Long> memberIds
    ) {
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }
        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException(
                    "conversationId khong hop le"
            );
        }
        if (memberIds == null || memberIds.isEmpty()) {
            throw new IllegalArgumentException(
                    "memberIds khong duoc de trong"
            );
        }
        // ==========================================
        // LOCK CONVERSATION
        // ==========================================
        Conversations conversation =
                conversationRepository
                        .findByIdForUpdate(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );
        // ==========================================
        // CHI GROUP CHAT MOI DUOC THEM MEMBER
        // ==========================================
        if (conversation.getType()
                != Conversations.type_chat.groups_chat) {
            throw new IllegalArgumentException(
                    "Conversation nay khong phai group chat"
            );
        }
        // ==========================================
        // KIEM TRA USER HIEN TAI CO TRONG NHOM
        // ==========================================
        Conversation_Member currentMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Ban khong thuoc nhom nay"
                                )
                        );
        // ==========================================
        // CHI ADMIN MOI DUOC THEM THANH VIEN
        // ==========================================

        if (currentMember.getMemberRole()
                != Conversation_Member.MemberRole.ADMIN) {

            throw new IllegalArgumentException(
                    "Chi ADMIN moi co quyen them thanh vien"
            );
        }
        // ==========================================
        // LOAD MEMBER HIEN TAI
        // ==========================================

        List<Conversation_Member> existingMembers =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        );
        Set<Long> existingMemberIds =
                existingMembers
                        .stream()
                        .map(member ->
                                member
                                        .getUser()
                                        .getId()
                        )
                        .collect(Collectors.toSet());
        // ==========================================
        // NORMALIZE REQUEST
        // ==========================================
        LinkedHashSet<Long> uniqueMemberIds =
                new LinkedHashSet<>();
        for (Long memberId : memberIds) {
            if (memberId == null || memberId < 1) {
                throw new IllegalArgumentException(
                        "memberId khong hop le"
                );
            }
            uniqueMemberIds.add(memberId);
        }

        // ==========================================
        // LOAI USER DA CO TRONG GROUP
        // ==========================================
        List<Long> newMemberIds =
                uniqueMemberIds
                        .stream()
                        .filter(memberId ->
                                !existingMemberIds.contains(
                                        memberId
                                )
                        )
                        .toList();
        // ==========================================
        // NEU TAT CA DA NAM TRONG GROUP
        // => IDEMPOTENT
        // ==========================================
        if (newMemberIds.isEmpty()) {
            return toResponse(
                    conversation,
                    existingMembers
            );
        }
        // ==========================================
        // MAXIMUM 100 MEMBER
        // ==========================================
        if (existingMembers.size()
                + newMemberIds.size() > 100) {

            throw new IllegalArgumentException(
                    "Nhom khong duoc vuot qua 100 thanh vien"
            );
        }
        // ==========================================
        // LOAD USER CAN ADD
        // ==========================================
        Map<Long, User> usersById =
                userRepository
                        .findAllById(newMemberIds)
                        .stream()
                        .collect(
                                Collectors.toMap(
                                        User::getId,
                                        Function.identity()
                                )
                        );
        // ==========================================
        // KIEM TRA USER KHONG TON TAI
        // ==========================================
        List<Long> missingUserIds =
                newMemberIds
                        .stream()
                        .filter(userId ->
                                !usersById.containsKey(
                                        userId
                                )
                        )
                        .toList();
        if (!missingUserIds.isEmpty()) {

            throw new IllegalArgumentException(
                    "Khong tim thay user: "
                            + missingUserIds
            );
        }
        // ==========================================
        // CREATE MEMBER
        // ==========================================
        List<Conversation_Member> newMembers =
                newMemberIds
                        .stream()
                        .map(userId -> {
                            Conversation_Member member =
                                    new Conversation_Member();
                            member.setConversation(
                                    conversation
                            );
                            member.setUser(
                                    usersById.get(userId)
                            );
                            member.setJoinAt(
                                    LocalDate.now()
                            );
                            member.setMemberRole(
                                    Conversation_Member
                                            .MemberRole
                                            .MEMBER
                            );
                            return member;
                        })
                        .toList();
        conversationMemberRepository
                .saveAll(newMembers);

        // ==========================================
        // RESPONSE = TOAN BO GROUP SAU KHI ADD
        // ==========================================
        List<Conversation_Member> allMembers =
                new ArrayList<>(
                        existingMembers
                );
        allMembers.addAll(
                newMembers
        );
        String addedNames =
                newMembers
                        .stream()
                        .map(member ->
                                member
                                        .getUser()
                                        .getUserName()
                        )
                        .collect(
                                Collectors.joining(", ")
                        );
        List<GroupMemberResponse> addedMembers =
                newMembers.stream()
                        .map(this::toMemberResponse)
                        .toList();
        publishGroupRealtimeEvent(
                allMembers,
                new GroupRealtimeEvent(
                        UUID.randomUUID()
                                .toString(),
                        GroupRealtimeEventType
                                .GROUP_MEMBERS_ADDED,
                        conversationId,
                        currentUserId,
                        newMembers.stream()
                                .map(member ->
                                        member
                                                .getUser()
                                                .getId()
                                )
                                .toList(),
                        null,
                        null,
                        addedMembers,
                        LocalDateTime.now()
                )
        );
        publishSystemMessage(
                conversationId,
                currentUserId,
                MessageType.GROUP_MEMBERS_ADDED,
                currentMember
                        .getUser()
                        .getUserName()
                        + " da them "
                        + addedNames
                        + " vao nhom"
        );
        return toResponse(
                conversation,
                allMembers
        );
    }
    @Override
    @Transactional
    public void removeGroupMember(
            Long currentUserId,
            Long conversationId,
            Long memberId
    ) {
        // ==========================================
        // VALIDATE
        // ==========================================
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }
        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException(
                    "conversationId khong hop le"
            );
        }
        if (memberId == null || memberId < 1) {
            throw new IllegalArgumentException(
                    "memberId khong hop le"
            );
        }
        // ==========================================
        // LOCK CONVERSATION
        // ==========================================
        Conversations conversation =
                conversationRepository
                        .findByIdForUpdate(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );
        // ==========================================
        // PHAI LA GROUP CHAT
        // ==========================================
        if (conversation.getType()
                != Conversations.type_chat.groups_chat) {
            throw new IllegalArgumentException(
                    "Conversation nay khong phai group chat"
            );
        }
        // ==========================================
        // KIEM TRA USER THUC HIEN
        // ==========================================
        Conversation_Member currentMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Ban khong thuoc nhom nay"
                                )
                        );
        // =========================================
        // CHI ADMIN MOI DUOC XOA MEMBER
        // ==========================================
        if (currentMember.getMemberRole()
                != Conversation_Member.MemberRole.ADMIN) {
            throw new IllegalArgumentException(
                    "Chi ADMIN moi co quyen xoa thanh vien"
            );
        }
        // ==========================================
        // KHONG DUNG API NAY DE TU ROI NHOM
        // ==========================================
        if (currentUserId.equals(memberId)) {
            throw new IllegalArgumentException(
                    "Khong the tu xoa chinh minh khoi nhom bang API nay"
            );
        }
        // ==========================================
        // KIEM TRA TARGET MEMBER
        // ==========================================
        Conversation_Member targetMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                memberId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "User khong thuoc nhom nay"
                                )
                        );
        // ==========================================
        // KHONG XOA ADMIN KHAC
        // ==========================================
        if (targetMember.getMemberRole()
                == Conversation_Member.MemberRole.ADMIN) {
            throw new IllegalArgumentException(
                    "Khong the xoa ADMIN khoi nhom bang API nay"
            );
        }
        // ==========================================
        // DELETE MEMBER
        // ==========================================
        List<Conversation_Member> recipients =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        );
        conversationMemberRepository.delete(
                targetMember
        );
        String removedUserName =
                targetMember
                        .getUser()
                        .getUserName();
        publishGroupRealtimeEvent(
                recipients,
                new GroupRealtimeEvent(
                        UUID.randomUUID()
                                .toString(),
                        GroupRealtimeEventType
                                .GROUP_MEMBER_REMOVED,
                        conversationId,
                        currentUserId,
                        List.of(memberId),
                        null,
                        null,
                        List.of(),
                        LocalDateTime.now()
                )
        );
        publishSystemMessage(
                conversationId,
                currentUserId,
                MessageType.GROUP_MEMBER_REMOVED,
                currentMember
                        .getUser()
                        .getUserName()
                        + " da xoa "
                        + removedUserName
                        + " khoi nhom"
        );
    }
    @Override
    @Transactional
    public void leaveGroup(
            Long currentUserId,
            Long conversationId
    ) {
        // ==========================================
        // VALIDATE
        // ==========================================
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }
        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException(
                    "conversationId khong hop le"
            );
        }
        // ==========================================
        // LOCK CONVERSATION
        // ==========================================
        Conversations conversation =
                conversationRepository
                        .findByIdForUpdate(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );
        // ==========================================
        // PHAI LA GROUP CHAT
        // ==========================================
        if (conversation.getType()
                != Conversations.type_chat.groups_chat) {
            throw new IllegalArgumentException(
                    "Conversation nay khong phai group chat"
            );
        }
        // ==========================================
        // USER PHAI THUOC GROUP
        // ==========================================
        Conversation_Member currentMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Ban khong thuoc nhom nay"
                                )
                        );
        // ==========================================
        // LOAD TOAN BO MEMBER
        // ==========================================
        List<Conversation_Member> members =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        );
        // ==========================================
        // NEU USER CHI LA MEMBER
        // ==========================================
        if (currentMember.getMemberRole()
                == Conversation_Member.MemberRole.MEMBER) {
            conversationMemberRepository.delete(
                    currentMember
            );
            return;
        }
        // ==========================================
        // USER HIEN TAI LA ADMIN
        // KIEM TRA CO ADMIN KHAC KHONG
        // ==========================================
        boolean hasAnotherAdmin =
                members.stream()
                        .anyMatch(member ->
                                !member.getUser()
                                        .getId()
                                        .equals(currentUserId)
                                        &&
                                        member.getMemberRole()
                                                == Conversation_Member
                                                .MemberRole
                                                .ADMIN
                        );
        // ==========================================
        // NEU CON ADMIN KHAC
        // KHONG CAN CHUYEN QUYEN
        // ==========================================
        if (hasAnotherAdmin) {
            conversationMemberRepository.delete(
                    currentMember
            );
            return;
        }
        // ==========================================
        // DAY LA ADMIN CUOI CUNG
        // TIM MEMBER KHAC DE CHUYEN ADMIN
        // ==========================================
        Conversation_Member nextAdmin =
                members.stream()
                        .filter(member ->
                                !member.getUser()
                                        .getId()
                                        .equals(currentUserId)
                        )
                        .findFirst()
                        .orElse(null);
        // ==========================================
        // CON NGUOI TRONG GROUP
        // => CHUYEN ADMIN
        // ==========================================
        if (nextAdmin != null) {

            nextAdmin.setMemberRole(
                    Conversation_Member
                            .MemberRole
                            .ADMIN
            );
            conversationMemberRepository.save(
                    nextAdmin
            );
        }
        // ==========================================
        // ROI GROUP
        // ==========================================
        List<Conversation_Member> recipients =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        );
        conversationMemberRepository.delete(
                currentMember
        );
        String leavingUserName =
                currentMember
                        .getUser()
                        .getUserName();
        publishGroupRealtimeEvent(
                recipients,
                new GroupRealtimeEvent(
                        UUID.randomUUID()
                                .toString(),
                        GroupRealtimeEventType
                                .GROUP_MEMBER_LEFT,
                        conversationId,
                        currentUserId,
                        List.of(currentUserId),
                        null,
                        null,
                        List.of(),
                        LocalDateTime.now()
                )
        );
        publishSystemMessage(
                conversationId,
                currentUserId,
                MessageType.GROUP_MEMBER_LEFT,
                leavingUserName
                        + " da roi khoi nhom"
        );
    }
    @Override
    @Transactional
    public GroupConversationResponse updateGroupName(
            Long currentUserId,
            Long conversationId,
            String name
    ) {
        // ==========================================
        // VALIDATE USER
        // ==========================================
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }
        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException(
                    "conversationId khong hop le"
            );
        }
        // ==========================================
        // VALIDATE + NORMALIZE NAME
        // =========================================
        String normalizedName =
                validateAndNormalizeGroupName(name);
        // ==========================================
        // LOCK CONVERSATION
        // ==========================================
        Conversations conversation =
                conversationRepository
                        .findByIdForUpdate(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );
        // ==========================================
        // PHAI LA GROUP CHAT
        // ==========================================
        if (conversation.getType()
                != Conversations.type_chat.groups_chat) {
            throw new IllegalArgumentException(
                    "Conversation nay khong phai group chat"
            );
        }
        // ==========================================
        // CURRENT USER PHAI THUOC GROUP
        // ==========================================
        Conversation_Member currentMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Ban khong thuoc nhom nay"
                                )
                        );
        // ==========================================
        // CHI ADMIN DUOC DOI TEN
        // ==========================================
        if (currentMember.getMemberRole()
                != Conversation_Member.MemberRole.ADMIN) {
            throw new IllegalArgumentException(
                    "Chi ADMIN moi co quyen doi ten nhom"
            );
        }
        // ==========================================
        // TEN KHONG DOI
        // ==========================================
        if (normalizedName.equals(
                conversation.getName()
        )) {
            List<Conversation_Member> members =
                    conversationMemberRepository
                            .findMembersByConversationId(
                                    conversationId
                            );
            return toResponse(
                    conversation,
                    members
            );
        }
        // ==========================================
        // UPDATE NAME
        // =========================================
        conversation.setName(
                normalizedName
        );
        Conversations savedConversation =
                conversationRepository.save(
                        conversation
                );
        // ==========================================
        // LOAD MEMBER DE RESPONSE
        // ==========================================
        List<Conversation_Member> members =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        );
        publishGroupRealtimeEvent(
                members,
                new GroupRealtimeEvent(
                        UUID.randomUUID()
                                .toString(),
                        GroupRealtimeEventType
                                .GROUP_NAME_UPDATED,
                        conversationId,
                        currentUserId,
                        List.of(),
                        normalizedName,
                        null,
                        List.of(),
                        LocalDateTime.now()
                )
        );
        publishSystemMessage(
                conversationId,
                currentUserId,
                MessageType.GROUP_NAME_CHANGED,
                currentMember
                        .getUser()
                        .getUserName()
                        + " da doi ten nhom thanh \""
                        + normalizedName
                        + "\""
        );
        return toResponse(
                savedConversation,
                members
        );
    }
    @Override
    @Transactional
    public GroupMemberResponse updateGroupMemberRole(
            Long currentUserId,
            Long conversationId,
            Long memberId,
            Conversation_Member.MemberRole role
    ) {

        // ==========================================
        // VALIDATE
        // ==========================================

        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }

        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException(
                    "conversationId khong hop le"
            );
        }

        if (memberId == null || memberId < 1) {
            throw new IllegalArgumentException(
                    "memberId khong hop le"
            );
        }

        if (role == null) {
            throw new IllegalArgumentException(
                    "role khong duoc de trong"
            );
        }


        // ==========================================
        // LOCK CONVERSATION
        // ==========================================

        Conversations conversation =
                conversationRepository
                        .findByIdForUpdate(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );


        // ==========================================
        // PHAI LA GROUP CHAT
        // ==========================================

        if (conversation.getType()
                != Conversations.type_chat.groups_chat) {

            throw new IllegalArgumentException(
                    "Conversation nay khong phai group chat"
            );
        }


        // ==========================================
        // USER THUC HIEN PHAI THUOC GROUP
        // ==========================================

        Conversation_Member currentMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Ban khong thuoc nhom nay"
                                )
                        );


        // ==========================================
        // CHI ADMIN MOI DUOC DOI ROLE
        // ==========================================

        if (currentMember.getMemberRole()
                != Conversation_Member.MemberRole.ADMIN) {

            throw new IllegalArgumentException(
                    "Chi ADMIN moi co quyen thay doi quyen thanh vien"
            );
        }


        // ==========================================
        // TARGET MEMBER PHAI THUOC GROUP
        // ==========================================

        Conversation_Member targetMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                memberId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "User khong thuoc nhom nay"
                                )
                        );
        // ==========================================
        // NEU ROLE KHONG DOI
        // ==========================================
        if (targetMember.getMemberRole() == role) {
            return toMemberResponse(
                    targetMember
            );
        }
        // ==========================================
        // NEU DANG HA ADMIN XUONG MEMBER
        // PHAI DAM BAO CON ADMIN KHAC
        // ==========================================
        if (targetMember.getMemberRole()
                == Conversation_Member.MemberRole.ADMIN
                &&
                role == Conversation_Member.MemberRole.MEMBER) {
            List<Conversation_Member> members =
                    conversationMemberRepository
                            .findMembersByConversationId(
                                    conversationId
                            );
            boolean hasAnotherAdmin =
                    members.stream()
                            .anyMatch(member ->
                                    !member.getUser()
                                            .getId()
                                            .equals(memberId)
                                            &&
                                            member.getMemberRole()
                                                    == Conversation_Member
                                                    .MemberRole
                                                    .ADMIN
                            );
            if (!hasAnotherAdmin) {
                throw new IllegalArgumentException(
                        "Nhom phai co it nhat mot ADMIN"
                );
            }
        }
        // ==========================================
        // UPDATE ROLE
        // ==========================================
        targetMember.setMemberRole(
                role
        );
        Conversation_Member savedMember =
                conversationMemberRepository.save(
                        targetMember
                );
        List<Conversation_Member> members =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        );
        publishGroupRealtimeEvent(
                members,
                new GroupRealtimeEvent(
                        UUID.randomUUID()
                                .toString(),
                        GroupRealtimeEventType
                                .GROUP_MEMBER_ROLE_UPDATED,
                        conversationId,
                        currentUserId,
                        List.of(memberId),
                        null,
                        null,
                        List.of(
                                toMemberResponse(
                                        savedMember
                                )
                        ),
                        LocalDateTime.now()
                )
        );
        String content;
        if (role ==
                Conversation_Member.MemberRole.ADMIN) {
            content =
                    currentMember
                            .getUser()
                            .getUserName()
                            + " da cap quyen ADMIN cho "
                            + targetMember
                            .getUser()
                            .getUserName();
        } else {
            content =
                    currentMember
                            .getUser()
                            .getUserName()
                            + " da go quyen ADMIN cua "
                            + targetMember
                            .getUser()
                            .getUserName();
        }
        publishSystemMessage(
                conversationId,
                currentUserId,
                MessageType
                        .GROUP_MEMBER_ROLE_CHANGED,
                content
        );
        return toMemberResponse(
                savedMember
        );
    }
    @Override
    @Transactional
    public GroupAvatarResponse updateGroupAvatar(
            Long currentUserId,
            Long conversationId,
            Long uploadId
    ) {
        // ==========================================
        // VALIDATE
        // ==========================================
        if (currentUserId == null || currentUserId < 1) {
            throw new IllegalArgumentException(
                    "User dang nhap khong hop le"
            );
        }
        if (conversationId == null || conversationId < 1) {
            throw new IllegalArgumentException(
                    "conversationId khong hop le"
            );
        }
        if (uploadId == null || uploadId < 1) {
            throw new IllegalArgumentException(
                    "uploadId khong hop le"
            );
        }
        // ==========================================
        // LOCK CONVERSATION
        // ==========================================
        Conversations conversation =
                conversationRepository
                        .findByIdForUpdate(conversationId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );
        // ==========================================
        // PHAI LA GROUP CHAT
        // ==========================================
        if (conversation.getType() != Conversations.type_chat.groups_chat) {
            throw new IllegalArgumentException(
                    "Conversation nay khong phai group chat"
            );
        }
        // ==========================================
        // KIEM TRA CURRENT MEMBER
        // ==========================================
        Conversation_Member currentMember =
                conversationMemberRepository
                        .findByConversationIdAndUserId(
                                conversationId,
                                currentUserId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Ban khong thuoc nhom nay"
                                )
                        );
        // ==========================================
        // CHI ADMIN DUOC DOI AVATAR
        // ==========================================
        if (currentMember.getMemberRole()
                != Conversation_Member.MemberRole.ADMIN) {
            throw new IllegalArgumentException(
                    "Chi ADMIN moi co quyen doi avatar nhom"
            );
        }
        // ==========================================
        // LOAD UPLOAD CUA CHINH USER
        // ==========================================
        List<ChatUpload> uploads =
                chatUploadRepository
                        .findOwnedUploadsForUpdate(
                                List.of(uploadId),
                                currentUserId
                        );
        if (uploads.isEmpty()) {
            throw new IllegalArgumentException(
                    "Khong tim thay upload"
            );
        }
        ChatUpload upload =
                uploads.get(0);
        // ==========================================
        // AVATAR BAT BUOC PHAI LA IMAGE
        // ==========================================
        if (upload.getAttachmentType()
                != AttachmentType.IMAGE) {
            throw new IllegalArgumentException(
                    "Avatar nhom phai la hinh anh"
            );
        }
        // ==========================================
        // UPDATE CONVERSATION
        // ==========================================
        conversation.setAvatarUrl(
                upload.getSecureUrl()
        );
        conversationRepository.saveAndFlush(
                conversation
        );
        // ==========================================
        // MARK UPLOAD DA DUOC SU DUNG
        // ==========================================
        upload.setUsedAt(
                LocalDateTime.now()
        );
        chatUploadRepository.saveAndFlush(
                upload
        );
        try {
            List<Conversation_Member> members =
                    conversationMemberRepository
                            .findMembersByConversationId(
                                    conversationId
                            );
            publishGroupRealtimeEvent(
                    members,
                    new GroupRealtimeEvent(
                            UUID.randomUUID()
                                    .toString(),
                            GroupRealtimeEventType
                                    .GROUP_AVATAR_UPDATED,
                            conversationId,
                            currentUserId,
                            List.of(),
                            null,
                            conversation.getAvatarUrl(),
                            List.of(),
                            LocalDateTime.now()
                    )
            );
            publishSystemMessage(
                    conversationId,
                    currentUserId,
                    MessageType.GROUP_AVATAR_CHANGED,
                    currentMember
                            .getUser()
                            .getUserName()
                            + " da doi anh nhom"
            );
        } catch (Exception eventError) {
            System.err.println(
                    "[ConversationCommandServiceImpl] Avatar saved but realtime/event publish failed: "
                            + eventError.getMessage()
            );
        }
        return new GroupAvatarResponse(
                conversation.getId(),
                conversation.getAvatarUrl()
        );
    }
    private List<String> getGroupDestinations(
            List<Conversation_Member> members
    ) {
        return members.stream()
                .map(member ->
                        member
                                .getUser()
                                .getEmail()
                )
                .distinct()
                .toList();
    }
    private void publishGroupRealtimeEvent(

            List<Conversation_Member> recipients,

            GroupRealtimeEvent payload
    ) {

        List<String> destinations =
                getGroupDestinations(
                        recipients
                );


        eventPublisher.publishEvent(

                new GroupRealtimePublishEvent(
                        destinations,
                        payload
                )
        );
    }
    private void publishSystemMessage(

            Long conversationId,

            Long actorUserId,

            MessageType type,

            String content
    ) {

        SystemMessageResult result =
                groupSystemMessageService
                        .createSystemMessage(

                                conversationId,

                                actorUserId,

                                type,

                                content
                        );


        eventPublisher.publishEvent(

                new SystemMessageRealtimeEvent(

                        result.message(),

                        result.destinations()
                )
        );
    }
}

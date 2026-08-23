package com.taihoang.social_backend.Service.Implements;

import com.taihoang.social_backend.Entity.*;
import com.taihoang.social_backend.Repository.ConversationMemberRepository;
import com.taihoang.social_backend.Repository.ConversationRepository;
import com.taihoang.social_backend.Repository.MessengerRepository;
import com.taihoang.social_backend.Repository.MessengerStatusRepository;
import com.taihoang.social_backend.Repository.UserRepository;
import com.taihoang.social_backend.Service.GroupSystemMessageService;
import com.taihoang.social_backend.dto.MessageResponse;
import com.taihoang.social_backend.dto.SystemMessageResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupSystemMessageServiceImpl
        implements GroupSystemMessageService {

    private final ConversationRepository
            conversationRepository;

    private final ConversationMemberRepository
            conversationMemberRepository;

    private final MessengerRepository
            messengerRepository;

    private final MessengerStatusRepository
            messengerStatusRepository;

    private final UserRepository
            userRepository;


    @Override
    @Transactional
    public SystemMessageResult createSystemMessage(

            Long conversationId,

            Long actorUserId,

            MessageType messageType,

            String content
    ) {

        if (messageType == null
                || messageType == MessageType.USER) {

            throw new IllegalArgumentException(
                    "messageType system khong hop le"
            );
        }

        if (content == null
                || content.isBlank()) {

            throw new IllegalArgumentException(
                    "Noi dung system message khong hop le"
            );
        }


        // ======================================
        // CONVERSATION
        // ======================================

        Conversations conversation =
                conversationRepository
                        .findByIdForUpdate(
                                conversationId
                        )
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay conversation"
                                )
                        );


        if (conversation.getType()
                != Conversations.type_chat.groups_chat) {

            throw new IllegalArgumentException(
                    "System message nay chi dung cho group chat"
            );
        }


        // ======================================
        // ACTOR
        // ======================================

        User actor =
                userRepository
                        .findById(actorUserId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Khong tim thay actor"
                                )
                        );


        // ======================================
        // SEQUENCE
        // ======================================

        Long nextSequenceNumber =
                messengerRepository
                        .findMaxSequenceNumberByConversationId(
                                conversationId
                        ) + 1;


        // ======================================
        // CREATE SYSTEM MESSAGE
        // ======================================

        Messenger messenger =
                new Messenger();

        messenger.setConversation(
                conversation
        );

        messenger.setUser(
                actor
        );

        messenger.setMessageType(
                messageType
        );

        messenger.setContent(
                content.trim()
        );

        messenger.setSequenceNumber(
                nextSequenceNumber
        );

        messenger.setSentAt(
                LocalDateTime.now()
        );


        // server sinh clientMessageId riêng
        messenger.setClientMessageId(
                "SYSTEM-" +
                        UUID.randomUUID()
                                .toString()
        );


        Messenger saved =
                messengerRepository
                        .save(messenger);


        // ======================================
        // STATUS CHO CAC USER KHAC
        // ======================================

        createStatuses(
                saved,
                actorUserId
        );


        // ======================================
        // DESTINATION
        // ======================================

        List<String> destinations =
                conversationMemberRepository
                        .findMembersByConversationId(
                                conversationId
                        )
                        .stream()

                        .map(member ->
                                member
                                        .getUser()
                                        .getEmail()
                        )

                        .distinct()

                        .toList();


        MessageResponse response =
                new MessageResponse(

                        saved.getId(),

                        conversationId,

                        saved.getClientMessageId(),

                        saved.getSequenceNumber(),

                        saved.getMessageType(),

                        actor.getId(),

                        actor.getUserName(),

                        saved.getContent(),

                        saved.getSentAt(),

                        null,

                        null,

                        null,

                        List.of(),

                        List.of()
                );
        return new SystemMessageResult(
                response,
                destinations
        );
    }
    private void createStatuses(
            Messenger messenger,
            Long actorUserId
    ) {
        List<MessengerStatus> statuses =
                conversationMemberRepository
                        .findRecipientsByConversationId(
                                messenger
                                        .getConversation()
                                        .getId(),
                                actorUserId
                        )
                        .stream()
                        .map(member -> {
                            MessengerStatus status =
                                    new MessengerStatus();
                            status.setMessenger(
                                    messenger
                            );
                            status.setUser(
                                    member.getUser()
                            );
                            status.setDeliveredAt(
                                    null
                            );
                            status.setSeenAt(
                                    null
                            );
                            return status;
                        })
                        .toList();
        messengerStatusRepository
                .saveAll(
                        statuses
                );
    }
}
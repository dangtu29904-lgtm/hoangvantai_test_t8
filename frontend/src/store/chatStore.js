import { create } from 'zustand';

export const TYPING_TIMEOUT_MS = 4000;
export const MESSAGE_ACK_TIMEOUT_MS = 8000;
const typingTimers = new Map();
const ackTimers = new Map();
const inFlightClientMessageIds = new Set();
const inFlightClientMessageAttempts = new Map();

const clearAckTimerByClientMessageId = (clientMessageId) => {
  if (!clientMessageId) return;
  const timer = ackTimers.get(clientMessageId);
  if (timer) clearTimeout(timer);
  ackTimers.delete(clientMessageId);
};

const clearAllAckTimers = () => {
  ackTimers.forEach((timer) => clearTimeout(timer));
  ackTimers.clear();
};

const clearAllInFlightClientMessageIds = () => {
  inFlightClientMessageIds.clear();
  inFlightClientMessageAttempts.clear();
};

const createClientMessageId = () => (
  globalThis.crypto?.randomUUID?.() || `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

// Temporary message format to distinguish from real messages
export const createTempMessage = (content, conversationId, senderId) => ({
  id: `temp-${Date.now()}`,
  clientMessageId: createClientMessageId(),
  conversationId,
  senderId,
  content,
  status: 'sending',
  sentAt: new Date().toISOString(),
  isTemp: true
});

const toTimestamp = (value) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeConversation = (conversation) => ({
  id: conversation.id,
  name: conversation.name ?? '',
  avatar: conversation.avatar ?? conversation.avatarUrl ?? null,
  unread: conversation.unread ?? conversation.unreadCount ?? 0,
  type: conversation.type,
  isGroup: conversation.isGroup ?? conversation.type === 'groups_chat',
  otherUserId: conversation.otherUserId ?? null,
  lastMessage: conversation.lastMessage ?? '',
  lastMessageId: conversation.lastMessageId ?? null,
  updatedAt: conversation.updatedAt ?? null
});

const sameId = (left, right) => Number(left) === Number(right);

const normalizeMember = (member) => ({
  ...member,
  role: member.role ?? member.memberRole
});

const mergeMembers = (members = [], incomingMembers = []) => {
  const byUserId = new Map();
  members.forEach((member) => byUserId.set(Number(member.userId), normalizeMember(member)));
  incomingMembers.forEach((member) => {
    const key = Number(member.userId);
    byUserId.set(key, {
      ...(byUserId.get(key) || {}),
      ...normalizeMember(member)
    });
  });
  return [...byUserId.values()];
};

const sortConversations = (conversations) =>
  [...conversations].sort((a, b) => {
    const updatedAtDiff = toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt);
    if (updatedAtDiff !== 0) return updatedAtDiff;
    const unreadDiff = (b.unread ?? 0) - (a.unread ?? 0);
    if (unreadDiff !== 0) return unreadDiff;
    return (b.id ?? 0) - (a.id ?? 0);
  });

const resolveMessageStatus = (message) => {
  if (message.status) return message.status;
  if (message.seenAt) return 'seen';
  if (message.deliveredAt) return 'delivered';
  return 'sent';
};

const normalizeMessage = (message) => ({
  ...message,
  status: resolveMessageStatus(message)
});

const sortMessages = (messages) =>
  [...messages].sort((a, b) => {
    const seqA = a.sequenceNumber ?? Number.MAX_SAFE_INTEGER;
    const seqB = b.sequenceNumber ?? Number.MAX_SAFE_INTEGER;
    if (seqA !== seqB) return seqA - seqB;

    const timeDiff = toTimestamp(a.sentAt) - toTimestamp(b.sentAt);
    if (timeDiff !== 0) return timeDiff;

    return String(a.id ?? a.clientMessageId ?? '').localeCompare(
      String(b.id ?? b.clientMessageId ?? '')
    );
  });

const mergeMessageLists = (prevMessages, incomingMessages) => {
  const map = new Map();
  [...prevMessages, ...incomingMessages].forEach((message) => {
    const key = message.id ?? message.clientMessageId;
    map.set(key, normalizeMessage(message));
  });
  return sortMessages([...map.values()]);
};

const messageMatches = (message, realMessage, clientMessageId) => (
  (realMessage.id != null && message.id === realMessage.id)
  || (clientMessageId != null && message.clientMessageId === clientMessageId)
  || (realMessage.clientMessageId != null && message.clientMessageId === realMessage.clientMessageId)
);

const mergeHistoryWithPendingTemps = (serverMessages, localMessages, pendingOutbound) => {
  const normalizedServerMessages = serverMessages.map(normalizeMessage);
  const serverClientMessageIds = new Set(
    normalizedServerMessages
      .map((message) => message.clientMessageId)
      .filter(Boolean)
  );

  const pendingTempMessages = localMessages.filter((message) => {
    const clientMessageId = message.clientMessageId;
    return message.isTemp
      && clientMessageId
      && pendingOutbound[clientMessageId]
      && !serverClientMessageIds.has(clientMessageId);
  });

  return sortMessages([
    ...normalizedServerMessages,
    ...pendingTempMessages.map(normalizeMessage)
  ]);
};

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  activeConversationDetail: null,
  viewingConversationId: null,
  messages: {}, // { conversationId: [messages] }
  onlineUsers: {}, // { userId: { status, lastSeenAt } }
  typingUsers: {},
  pendingOutbound: {}, // { clientMessageId: pending message metadata }
  inFlightOutbound: {}, // { clientMessageId: true }
  
  setConversations: (conversations) => set((state) => {
    const merged = conversations.map((conversation) => {
      const next = normalizeConversation(conversation);
      const existing = state.conversations.find((item) => item.id === next.id);

      if (!existing) {
        return state.viewingConversationId === next.id ? { ...next, unread: 0 } : next;
      }

      const serverUpdatedAt = toTimestamp(next.updatedAt);
      const localUpdatedAt = toTimestamp(existing.updatedAt);
      const shouldKeepLocal = localUpdatedAt > serverUpdatedAt;
      const unread = state.viewingConversationId === next.id || existing.unread === 0
        ? 0
        : next.unread;

      return normalizeConversation({
        ...next,
        unread,
        name: shouldKeepLocal && existing.name ? existing.name : next.name,
        avatar: shouldKeepLocal && existing.avatar ? existing.avatar : next.avatar,
        lastMessage: shouldKeepLocal && existing.lastMessage ? existing.lastMessage : next.lastMessage,
        lastMessageId: shouldKeepLocal && existing.lastMessageId ? existing.lastMessageId : next.lastMessageId,
        otherUserId: existing.otherUserId ?? next.otherUserId,
        updatedAt: shouldKeepLocal ? existing.updatedAt : next.updatedAt
      });
    });

    const normalized = sortConversations(merged);
    const activeConversation = state.activeConversation
      ? normalized.find((conversation) => conversation.id === state.activeConversation.id) ?? state.activeConversation
      : state.activeConversation;

    return {
      conversations: normalized,
      activeConversation
    };
  }),

  upsertConversation: (conversation) => set((state) => {
    const next = normalizeConversation(conversation);
    const existing = state.conversations.find((item) => item.id === next.id);
    const mergedConversation = existing
      ? normalizeConversation({
          ...existing,
          ...next,
          unread: state.viewingConversationId === next.id ? 0 : (next.unread ?? existing.unread ?? 0),
        })
      : normalizeConversation({
          ...next,
          unread: state.viewingConversationId === next.id ? 0 : (next.unread ?? 0)
        });

    const conversations = sortConversations([
      ...state.conversations.filter((item) => item.id !== next.id),
      mergedConversation
    ]);

    const activeConversation = state.activeConversation?.id === next.id
      ? mergedConversation
      : state.activeConversation;

    return {
      conversations,
      activeConversation
    };
  }),

  removeConversation: (conversationId) => set((state) => ({
    conversations: state.conversations.filter((conversation) => conversation.id !== conversationId),
    activeConversation: state.activeConversation?.id === conversationId ? null : state.activeConversation,
    activeConversationDetail: state.activeConversationDetail?.id === conversationId ? null : state.activeConversationDetail,
    viewingConversationId: state.viewingConversationId === conversationId ? null : state.viewingConversationId,
    messages: Object.fromEntries(
      Object.entries(state.messages).filter(([key]) => Number(key) !== Number(conversationId))
    )
  })),

  applyGroupRealtimeEvent: (event, currentUserId) => set((state) => {
    if (!event?.conversationId || !event?.type) return state;

    const conversationId = event.conversationId;
    const targetUserIds = event.targetUserIds || [];
    const currentUserIsTarget = currentUserId != null
      && targetUserIds.some((userId) => sameId(userId, currentUserId));
    const removedForCurrentUser = currentUserIsTarget
      && ['GROUP_MEMBER_REMOVED', 'GROUP_MEMBER_LEFT'].includes(event.type);

    if (removedForCurrentUser) {
      return {
        conversations: state.conversations.filter((conversation) => !sameId(conversation.id, conversationId)),
        activeConversation: sameId(state.activeConversation?.id, conversationId) ? null : state.activeConversation,
        activeConversationDetail: sameId(state.activeConversationDetail?.id, conversationId) ? null : state.activeConversationDetail,
        viewingConversationId: sameId(state.viewingConversationId, conversationId) ? null : state.viewingConversationId,
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([key]) => !sameId(key, conversationId))
        )
      };
    }

    const patch = {
      type: 'groups_chat',
      isGroup: true,
      updatedAt: event.occurredAt || undefined
    };

    if (event.type === 'GROUP_NAME_UPDATED' && event.name != null) {
      patch.name = event.name;
    }

    if (event.type === 'GROUP_AVATAR_UPDATED' && event.avatarUrl != null) {
      patch.avatar = event.avatarUrl;
    }

    const conversations = state.conversations.some((conversation) => sameId(conversation.id, conversationId))
      ? state.conversations.map((conversation) => (
          sameId(conversation.id, conversationId)
            ? normalizeConversation({
                ...conversation,
                ...patch,
                updatedAt: patch.updatedAt ?? conversation.updatedAt
              })
            : conversation
        ))
      : [
          ...state.conversations,
          normalizeConversation({
            id: conversationId,
            name: event.name || `Conversation ${conversationId}`,
            avatar: event.avatarUrl || null,
            unread: 0,
            type: 'groups_chat',
            isGroup: true,
            updatedAt: event.occurredAt || null
          })
        ];

    const nextActiveConversation = sameId(state.activeConversation?.id, conversationId)
      ? normalizeConversation({
          ...state.activeConversation,
          ...patch,
          updatedAt: patch.updatedAt ?? state.activeConversation.updatedAt
        })
      : state.activeConversation;

    const nextDetail = sameId(state.activeConversationDetail?.id, conversationId)
      ? (() => {
          const detailPatch = {};
          if (event.type === 'GROUP_NAME_UPDATED' && event.name != null) detailPatch.name = event.name;
          if (event.type === 'GROUP_AVATAR_UPDATED' && event.avatarUrl != null) detailPatch.avatarUrl = event.avatarUrl;

          let members = state.activeConversationDetail.members || [];
          if (event.type === 'GROUP_MEMBERS_ADDED') {
            members = mergeMembers(members, event.members || []);
          }
          if (['GROUP_MEMBER_REMOVED', 'GROUP_MEMBER_LEFT'].includes(event.type)) {
            members = members.filter((member) => !targetUserIds.some((userId) => sameId(userId, member.userId)));
          }
          if (event.type === 'GROUP_MEMBER_ROLE_UPDATED') {
            members = mergeMembers(members, event.members || []);
          }

          const currentUserMember = members.find((member) => sameId(member.userId, currentUserId));

          return {
            ...state.activeConversationDetail,
            ...detailPatch,
            members,
            currentUserRole: currentUserMember?.role ?? state.activeConversationDetail.currentUserRole
          };
        })()
      : state.activeConversationDetail;

    return {
      conversations: sortConversations(conversations),
      activeConversation: nextActiveConversation,
      activeConversationDetail: nextDetail
    };
  }),
  
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),

  setViewingConversation: (conversationId) => set({ viewingConversationId: conversationId }),

  setActiveConversationDetail: (detail) => set({ activeConversationDetail: detail }),

  updatePresence: (userId, state) => set((prev) => ({
    onlineUsers: {
      ...prev.onlineUsers,
      [userId]: state
    }
  })),

  // Store the other user's id on the conversation object after fetching detail
  updateConversationOtherUserId: (conversationId, otherUserId) => set((state) => ({
    conversations: state.conversations.map(c =>
      c.id === conversationId ? { ...c, otherUserId } : c
    )
  })),

  updateConversationFromMessage: (conversationId, message, options = {}) => set((state) => {
    const {
      unreadDelta = 0,
      resetUnread = false,
      name,
      avatar,
      otherUserId
    } = options;

    const existingConversation = state.conversations.find((conversation) => conversation.id === conversationId);
    const isViewingConversation = state.viewingConversationId === conversationId;
    const nextConversation = normalizeConversation({
      id: conversationId,
      name: name ?? existingConversation?.name ?? `Conversation ${conversationId}`,
      avatar: avatar ?? existingConversation?.avatar ?? null,
      unread: isViewingConversation || resetUnread ? 0 : Math.max(0, (existingConversation?.unread ?? 0) + unreadDelta),
      type: existingConversation?.type ?? message?.type ?? 'private_chat',
      isGroup: existingConversation?.isGroup ?? false,
      otherUserId: otherUserId ?? existingConversation?.otherUserId ?? null,
      lastMessage: message?.content ?? existingConversation?.lastMessage ?? '',
      lastMessageId: message?.id ?? existingConversation?.lastMessageId ?? null,
      updatedAt: message?.sentAt ?? existingConversation?.updatedAt ?? null
    });

    const updatedConversations = state.conversations.some((conversation) => conversation.id === conversationId)
      ? state.conversations.map((conversation) =>
          conversation.id === conversationId ? nextConversation : conversation
        )
      : [...state.conversations, nextConversation];

    const sorted = sortConversations(updatedConversations);
    const activeConversation = state.activeConversation?.id === conversationId
      ? sorted.find((conversation) => conversation.id === conversationId) ?? state.activeConversation
      : state.activeConversation;

    return {
      conversations: sorted,
      activeConversation
    };
  }),

  markConversationSeen: (conversationId) => set((state) => {
    const updatedConversations = state.conversations.map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, unread: 0 }
        : conversation
    );

    return {
      conversations: sortConversations(updatedConversations),
      viewingConversationId: conversationId
    };
  }),
  
  setMessages: (conversationId, messages) => set((state) => {
    const localMessages = state.messages[conversationId] || [];
    const nextMessages = mergeHistoryWithPendingTemps(
      messages,
      localMessages,
      state.pendingOutbound
    );

    return {
      messages: {
        ...state.messages,
        [conversationId]: nextMessages
      }
    };
  }),

  appendMessages: (conversationId, messages) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: mergeMessageLists(prevMessages, messages)
      }
    };
  }),

  prependMessages: (conversationId, messages) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: mergeMessageLists(messages, prevMessages)
      }
    };
  }),

  addMessage: (conversationId, message) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    // Prevent duplicate processing if it's already there (e.g., via WebSocket after HTTP)
    if (prevMessages.some(m => (
      (message.id != null && m.id === message.id)
      || (message.clientMessageId != null && m.clientMessageId === message.clientMessageId && !m.isTemp)
    ))) {
      return state;
    }

    const nextMessages = mergeMessageLists(prevMessages, [message]);
    return {
      messages: {
        ...state.messages,
        [conversationId]: nextMessages
      }
    };
  }),

  hasMessage: (conversationId, message) => {
    const prevMessages = get().messages[conversationId] || [];
    return prevMessages.some(m => (
      (message.id != null && m.id === message.id)
      || (message.clientMessageId != null && m.clientMessageId === message.clientMessageId && !m.isTemp)
    ));
  },

  // Used for optimistic update
  addTempMessage: (conversationId, message) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: mergeMessageLists(prevMessages, [message])
      }
    };
  }),

  addPendingOutbound: (item) => set((state) => ({
    pendingOutbound: {
      ...state.pendingOutbound,
      [item.clientMessageId]: {
        ...item,
        status: item.status ?? 'sending'
      }
    }
  })),

  beginOutboundInFlight: (clientMessageId, attemptKey = null) => {
    if (!clientMessageId || inFlightClientMessageIds.has(clientMessageId)) return false;
    inFlightClientMessageIds.add(clientMessageId);
    inFlightClientMessageAttempts.set(clientMessageId, attemptKey);
    set((state) => ({
      inFlightOutbound: {
        ...state.inFlightOutbound,
        [clientMessageId]: { attemptKey }
      }
    }));
    return true;
  },

  clearOutboundInFlight: (clientMessageId) => {
    if (!clientMessageId) return;
    inFlightClientMessageIds.delete(clientMessageId);
    inFlightClientMessageAttempts.delete(clientMessageId);
    set((state) => {
      if (!state.inFlightOutbound[clientMessageId]) return state;
      const nextInFlight = { ...state.inFlightOutbound };
      delete nextInFlight[clientMessageId];
      return { inFlightOutbound: nextInFlight };
    });
  },

  isOutboundInFlight: (clientMessageId) => (
    Boolean(clientMessageId) && inFlightClientMessageIds.has(clientMessageId)
  ),

  releaseStaleOutboundInFlight: (clientMessageId, currentAttemptKey) => {
    if (!clientMessageId || !inFlightClientMessageIds.has(clientMessageId)) return true;

    const attemptKey = inFlightClientMessageAttempts.get(clientMessageId);
    const isStale = currentAttemptKey == null
      || attemptKey == null
      || Number(attemptKey) < Number(currentAttemptKey);

    if (!isStale) return false;

    get().clearOutboundInFlight(clientMessageId);
    return true;
  },

  removePendingOutbound: (clientMessageId) => {
    clearAckTimerByClientMessageId(clientMessageId);
    get().clearOutboundInFlight(clientMessageId);
    set((state) => {
      const nextPending = { ...state.pendingOutbound };
      delete nextPending[clientMessageId];
      return { pendingOutbound: nextPending };
    });
  },

  updatePendingOutboundStatus: (clientMessageId, status) => set((state) => {
    if (!state.pendingOutbound[clientMessageId]) return state;
    return {
      pendingOutbound: {
        ...state.pendingOutbound,
        [clientMessageId]: {
          ...state.pendingOutbound[clientMessageId],
          status
        }
      }
    };
  }),

  clearAckTimer: (clientMessageId) => {
    clearAckTimerByClientMessageId(clientMessageId);
  },

  clearAllAckTimers: () => {
    clearAllAckTimers();
  },

  clearPendingOutbound: () => {
    clearAllAckTimers();
    clearAllInFlightClientMessageIds();
    set({ pendingOutbound: {}, inFlightOutbound: {} });
  },

  startAckTimer: (clientMessageId) => {
    clearAckTimerByClientMessageId(clientMessageId);
    const timer = setTimeout(() => {
      const pending = get().pendingOutbound[clientMessageId];
      if (!pending) {
        get().clearOutboundInFlight(clientMessageId);
        ackTimers.delete(clientMessageId);
        return;
      }

      get().markMessageFailedByClientMessageId(pending.conversationId, clientMessageId);
      get().updatePendingOutboundStatus(clientMessageId, 'failed');
      get().clearOutboundInFlight(clientMessageId);
      ackTimers.delete(clientMessageId);
    }, MESSAGE_ACK_TIMEOUT_MS);

    ackTimers.set(clientMessageId, timer);
  },

  markMessageFailedByClientMessageId: (conversationId, clientMessageId) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: prevMessages.map((message) => (
          message.clientMessageId === clientMessageId && message.status === 'sending'
            ? { ...message, status: 'failed' }
            : message
        ))
      }
    };
  }),

  markMessageSendingByClientMessageId: (conversationId, clientMessageId) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    return {
      messages: {
        ...state.messages,
        [conversationId]: prevMessages.map((message) => (
          message.clientMessageId === clientMessageId
            ? { ...message, status: 'sending' }
            : message
        ))
      }
    };
  }),

  // When we receive ACK from server
  confirmMessage: (conversationId, clientMessageId, realMessage) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    const hasMatchingMessage = prevMessages.some((message) =>
      messageMatches(message, realMessage, clientMessageId)
    );

    const nextMessages = prevMessages.filter((message, index, messages) => {
      if (!messageMatches(message, realMessage, clientMessageId)) return true;
      return index === messages.findIndex((candidate) => messageMatches(candidate, realMessage, clientMessageId));
    }).map((message) => (
      messageMatches(message, realMessage, clientMessageId)
        ? normalizeMessage({ ...realMessage, isTemp: false })
        : message
    ));

    if (!hasMatchingMessage) {
      nextMessages.push(normalizeMessage({ ...realMessage, isTemp: false }));
    }

    return {
      messages: {
        ...state.messages,
        [conversationId]: sortMessages(nextMessages.map(normalizeMessage))
      }
    };
  }),

  updateMessageStatus: (conversationId, messageId, status) => set((state) => {
    const prevMessages = state.messages[conversationId] || [];
    const nextMessages = prevMessages.map(msg => 
      msg.id === messageId 
        ? { ...msg, status }
        : msg
    );
    return {
      messages: {
        ...state.messages,
        [conversationId]: nextMessages
      }
    };
  }),

  updateMessage: (messageId, patch) => set((state) => ({
    messages: Object.fromEntries(Object.entries(state.messages).map(([conversationId, messages]) => [
      conversationId,
      messages.map(message => message.id === messageId ? { ...message, ...patch } : message)
    ]))
  })),

  removeMessage: (conversationId, messageId) => set((state) => ({
    messages: { ...state.messages, [conversationId]: (state.messages[conversationId] || []).filter(message => message.id !== messageId) }
  })),

  updateMessageReaction: (event) => set((state) => ({
    messages: Object.fromEntries(Object.entries(state.messages).map(([conversationId, messages]) => [conversationId, messages.map(message => {
      if (message.id !== event.messageId) return message;
      const reactions = [...(message.reactions || [])].filter(reaction => reaction.userId !== event.userId);
      if (event.action !== 'REMOVED') reactions.push(event);
      return { ...message, reactions };
    })]) )
  })),

  setTyping: (conversationId, userId, typing) => {
    const timerKey = `${conversationId}:${userId}`;
    const previousTimer = typingTimers.get(timerKey);
    if (previousTimer) clearTimeout(previousTimer);

    if (!typing) {
      typingTimers.delete(timerKey);
      set((state) => ({
        typingUsers: { ...state.typingUsers, [conversationId]: null }
      }));
      return;
    }

    const timer = setTimeout(() => {
      typingTimers.delete(timerKey);
      set((state) => ({
        typingUsers: state.typingUsers[conversationId] === userId
          ? { ...state.typingUsers, [conversationId]: null }
          : state.typingUsers
      }));
    }, TYPING_TIMEOUT_MS);
    typingTimers.set(timerKey, timer);

    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: userId }
    }));
  },
  
  updateConversationStatus: (conversationId, lastSeenAt, seenMessageIds) => set((state) => {
     const updatedConversations = state.conversations.map((conversation) =>
       conversation.id === conversationId
         ? { ...conversation, unread: 0, updatedAt: lastSeenAt ?? conversation.updatedAt }
         : conversation
     );
     return {
       conversations: sortConversations(updatedConversations),
       viewingConversationId: conversationId
     };
  }),
}));

export default useChatStore;

import { create } from 'zustand';

export const TYPING_TIMEOUT_MS = 4000;
const typingTimers = new Map();

// Temporary message format to distinguish from real messages
export const createTempMessage = (content, conversationId, senderId) => ({
  id: `temp-${Date.now()}`,
  clientMessageId: `msg-${Date.now()}`,
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

const sortConversations = (conversations) =>
  [...conversations].sort((a, b) => {
    const updatedAtDiff = toTimestamp(b.updatedAt) - toTimestamp(a.updatedAt);
    if (updatedAtDiff !== 0) return updatedAtDiff;
    const unreadDiff = (b.unread ?? 0) - (a.unread ?? 0);
    if (unreadDiff !== 0) return unreadDiff;
    return (b.id ?? 0) - (a.id ?? 0);
  });

const normalizeMessage = (message) => ({
  ...message,
  status: message.status ?? 'sent'
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

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  activeConversationDetail: null,
  viewingConversationId: null,
  messages: {}, // { conversationId: [messages] }
  onlineUsers: {}, // { userId: { status, lastSeenAt } }
  typingUsers: {},
  
  setConversations: (conversations) => set((state) => {
    const normalized = sortConversations(conversations.map(normalizeConversation));
    const activeConversation = state.activeConversation
      ? normalized.find((conversation) => conversation.id === state.activeConversation.id) ?? state.activeConversation
      : state.activeConversation;

    return {
      conversations: normalized,
      activeConversation
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
    const nextConversation = normalizeConversation({
      id: conversationId,
      name: name ?? existingConversation?.name ?? `Conversation ${conversationId}`,
      avatar: avatar ?? existingConversation?.avatar ?? null,
      unread: resetUnread ? 0 : Math.max(0, (existingConversation?.unread ?? 0) + unreadDelta),
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
      conversations: sortConversations(updatedConversations)
    };
  }),
  
  setMessages: (conversationId, messages) => set((state) => ({
    messages: {
      ...state.messages,
      [conversationId]: sortMessages(messages.map(normalizeMessage))
    }
  })),

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
        ? { ...realMessage, status: 'sent', isTemp: false }
        : message
    ));

    if (!hasMatchingMessage) {
      nextMessages.push({ ...realMessage, status: 'sent', isTemp: false });
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
       conversations: sortConversations(updatedConversations)
     };
  }),
}));

export default useChatStore;

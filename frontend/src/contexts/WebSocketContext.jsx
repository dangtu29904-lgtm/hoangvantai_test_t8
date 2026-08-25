import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { wsService } from '../services/websocket/stompClient';
import useChatStore from '../store/chatStore';
import { chatApi } from '../services/api';

const WebSocketContext = createContext();

const PAGE_SIZE = 50;

async function fetchAllMissedMessages() {
  const allMessages = [];
  let afterMessageId = null;
  let safetyLimit = 50;

  while (safetyLimit-- > 0) {
    const response = await chatApi.syncMessages(afterMessageId, 100);
    const items = response.items ?? [];
    allMessages.push(...items);

    if (!response.hasMore) break;

    const next = response.nextAfterMessageId ?? null;
    if (next === null || next === afterMessageId) break;
    afterMessageId = next;
  }

  return allMessages;
}

const normalizeIncomingMessage = (message) => ({
  ...message,
  status: message.seenAt ? 'seen' : message.deliveredAt ? 'delivered' : message.status ?? 'sent'
});

const WebSocketEventBridge = ({ children, isConnected, connectCount, wsService }) => {
  const { user } = useAuth();
  const viewingConversationId = useChatStore(state => state.viewingConversationId);
  const addMessage = useChatStore(state => state.addMessage);
  const confirmMessage = useChatStore(state => state.confirmMessage);
  const updateMessageStatus = useChatStore(state => state.updateMessageStatus);
  const updateConversationFromMessage = useChatStore(state => state.updateConversationFromMessage);
  const markConversationSeen = useChatStore(state => state.markConversationSeen);
  const setMessages = useChatStore(state => state.setMessages);

  const isSyncingRef = useRef(false);
  const pendingSyncCountRef = useRef(0);

  const processIncomingMessage = useCallback((msg, source) => {
    const conversationId = msg.conversationId;
    const currentViewingId = useChatStore.getState().viewingConversationId;
    const isViewingConversation = currentViewingId === conversationId;
    const isOwnMessage = user && msg.senderId === user.id;
    const isDuplicate = useChatStore.getState().hasMessage(conversationId, msg);

    if (!isDuplicate) {
      addMessage(conversationId, normalizeIncomingMessage({ ...msg, status: 'delivered' }));
      updateConversationFromMessage(conversationId, msg, {
        unreadDelta: isOwnMessage || isViewingConversation ? 0 : 1,
        resetUnread: isViewingConversation
      });

      if (!isOwnMessage) {
        wsService.send('/app/chat.delivered', { messageId: msg.id });
      }

      if (isViewingConversation && source === 'realtime') {
        wsService.send('/app/chat.seenConversation', { conversationId });
        markConversationSeen(conversationId);
      }
    }

    return !isDuplicate;
  }, [addMessage, markConversationSeen, updateConversationFromMessage, user, wsService]);

  useEffect(() => {
    if (!isConnected || !user) return undefined;

    const handleNewMessage = (msg) => {
      processIncomingMessage(msg, 'realtime');
    };

    const handleAck = (msg) => {
      confirmMessage(msg.conversationId, msg.clientMessageId, msg);
      updateConversationFromMessage(msg.conversationId, msg, {
        unreadDelta: 0,
        resetUnread: true
      });
    };

    const handleDelivered = (res) => {
      updateMessageStatus(res.conversationId, res.messageId, 'delivered');
    };

    const handleSeen = (res) => {
      const cid = res.conversationId;
      if (res.messageIds && Array.isArray(res.messageIds) && res.messageIds.length > 0) {
        res.messageIds.forEach((id) => updateMessageStatus(cid, id, 'seen'));
      } else if (res.messageId) {
        updateMessageStatus(cid, res.messageId, 'seen');
      }
    };

    const handlePresence = (state) => {
      if (state && state.userId) {
        useChatStore.getState().updatePresence(state.userId, state);
      }
    };

    const handleUpdated = (event) => useChatStore.getState().updateMessage(event.messageId, { content: event.content, editedAt: event.editedAt });
    const handleRecalled = (event) => useChatStore.getState().updateMessage(event.messageId, { content: '', recalledAt: event.recalledAt });
    const handleDeleted = (event) => useChatStore.getState().removeMessage(event.conversationId, event.messageId);
    const handleReaction = (event) => useChatStore.getState().updateMessageReaction(event);
    const handleTyping = (event) => {
      if (event?.conversationId && event?.userId) {
        useChatStore.getState().setTyping(event.conversationId, event.userId, event.typing);
      }
    };

    wsService.subscribe('/user/queue/messages', handleNewMessage);
    wsService.subscribe('/user/queue/messages.ack', handleAck);
    wsService.subscribe('/user/queue/messages.delivered', handleDelivered);
    wsService.subscribe('/user/queue/messages.seen', handleSeen);
    wsService.subscribe('/user/queue/presence', handlePresence);
    wsService.subscribe('/user/queue/messages.updated', handleUpdated);
    wsService.subscribe('/user/queue/messages.recalled', handleRecalled);
    wsService.subscribe('/user/queue/messages.deleted-for-me', handleDeleted);
    wsService.subscribe('/user/queue/messages.reaction', handleReaction);
    wsService.subscribe('/user/queue/chat.typing', handleTyping);

    return () => {
      wsService.unsubscribe('/user/queue/messages', handleNewMessage);
      wsService.unsubscribe('/user/queue/messages.ack', handleAck);
      wsService.unsubscribe('/user/queue/messages.delivered', handleDelivered);
      wsService.unsubscribe('/user/queue/messages.seen', handleSeen);
      wsService.unsubscribe('/user/queue/presence', handlePresence);
      wsService.unsubscribe('/user/queue/messages.updated', handleUpdated);
      wsService.unsubscribe('/user/queue/messages.recalled', handleRecalled);
      wsService.unsubscribe('/user/queue/messages.deleted-for-me', handleDeleted);
      wsService.unsubscribe('/user/queue/messages.reaction', handleReaction);
      wsService.unsubscribe('/user/queue/chat.typing', handleTyping);
    };
  }, [isConnected, user, processIncomingMessage, confirmMessage, updateConversationFromMessage, updateMessageStatus, wsService]);

  useEffect(() => {
    if (connectCount === 0 || !user || !isConnected) return;

    const runSync = async () => {
      if (isSyncingRef.current) {
        pendingSyncCountRef.current = connectCount;
        return;
      }

      isSyncingRef.current = true;
      let currentSyncCount = connectCount;

      try {
        while (true) {
          const missedMessages = await fetchAllMissedMessages();
          if (missedMessages.length > 0) {
            const currentViewingId = useChatStore.getState().viewingConversationId;
            const seenConversationIds = new Set();

            for (const msg of missedMessages) {
              const inserted = processIncomingMessage(msg, 'sync');
              if (inserted && currentViewingId === msg.conversationId) {
                seenConversationIds.add(msg.conversationId);
              }
            }

            for (const cid of seenConversationIds) {
              wsService.send('/app/chat.seenConversation', { conversationId: cid });
              useChatStore.getState().markConversationSeen(cid);
            }
          }

          if (pendingSyncCountRef.current > currentSyncCount) {
            currentSyncCount = pendingSyncCountRef.current;
          } else {
            break;
          }
        }
      } catch (error) {
        console.error('[WebSocketBridge] sync failed:', error);
      } finally {
        isSyncingRef.current = false;
        pendingSyncCountRef.current = 0;
      }
    };

    runSync();
  }, [connectCount, isConnected, markConversationSeen, processIncomingMessage, setMessages, user, wsService]);

  return children;
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  // Incremented on every successful STOMP connect (1 = first, 2+ = reconnect)
  const [connectCount, setConnectCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && token) {
      wsService.connect(
        token,
        // onConnect receives the running connectCount from stompClient
        (count) => {
          setIsConnected(true);
          setConnectCount(count);
        },
        // onDisconnect
        () => setIsConnected(false),
        // onError
        () => setIsConnected(false)
      );
    } else {
      wsService.disconnect();
      setIsConnected(false);
      setConnectCount(0);
    }

    return () => {
      wsService.disconnect();
    };
  }, [token, isAuthenticated]);

  return (
    <WebSocketContext.Provider value={{ isConnected, connectCount, wsService }}>
      <WebSocketEventBridge isConnected={isConnected} connectCount={connectCount} wsService={wsService}>
        {children}
      </WebSocketEventBridge>
    </WebSocketContext.Provider>
  );
};

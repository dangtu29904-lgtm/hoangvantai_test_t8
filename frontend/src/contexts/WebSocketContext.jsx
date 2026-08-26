import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { wsService } from '../services/websocket/stompClient';
import useChatStore from '../store/chatStore';
import { chatApi } from '../services/api';
import { resendPendingMessagesAfterReconnect } from '../services/websocket/chatReliability';
import {
  getSyncRetryDelayMs,
  isRetryableSyncError,
  SYNC_RETRY_MAX_ATTEMPTS
} from '../services/websocket/chatSyncReliability';

const WebSocketContext = createContext();

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
  const addMessage = useChatStore(state => state.addMessage);
  const confirmMessage = useChatStore(state => state.confirmMessage);
  const clearAckTimer = useChatStore(state => state.clearAckTimer);
  const clearOutboundInFlight = useChatStore(state => state.clearOutboundInFlight);
  const removePendingOutbound = useChatStore(state => state.removePendingOutbound);
  const updateMessageStatus = useChatStore(state => state.updateMessageStatus);
  const updateConversationFromMessage = useChatStore(state => state.updateConversationFromMessage);
  const markConversationSeen = useChatStore(state => state.markConversationSeen);
  const applyGroupRealtimeEvent = useChatStore(state => state.applyGroupRealtimeEvent);

  const isSyncingRef = useRef(false);
  const pendingSyncCountRef = useRef(0);
  const isResendingPendingRef = useRef(false);
  const syncRetryWaitRef = useRef(null);
  const syncMountedRef = useRef(true);

  const cancelSyncRetryWait = useCallback(() => {
    const pendingWait = syncRetryWaitRef.current;
    if (!pendingWait) return;

    clearTimeout(pendingWait.timerId);
    pendingWait.resolve(false);
    syncRetryWaitRef.current = null;
  }, []);

  const isCurrentSyncConnection = useCallback((syncCount) => (
    syncMountedRef.current
      && Boolean(wsService.isConnected?.())
      && wsService.connectCount === syncCount
  ), [wsService]);

  const waitForSyncRetry = useCallback((delayMs, syncCount) => {
    cancelSyncRetryWait();

    return new Promise((resolve) => {
      if (!isCurrentSyncConnection(syncCount)) {
        resolve(false);
        return;
      }

      const timerId = setTimeout(() => {
        syncRetryWaitRef.current = null;
        resolve(isCurrentSyncConnection(syncCount));
      }, delayMs);

      syncRetryWaitRef.current = { timerId, resolve };
    });
  }, [cancelSyncRetryWait, isCurrentSyncConnection]);

  useEffect(() => {
    syncMountedRef.current = true;

    return () => {
      syncMountedRef.current = false;
      cancelSyncRetryWait();
    };
  }, [cancelSyncRetryWait]);

  useEffect(() => {
    if (!isConnected) {
      cancelSyncRetryWait();
    }
  }, [cancelSyncRetryWait, isConnected]);

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
      clearAckTimer(msg.clientMessageId);
      clearOutboundInFlight(msg.clientMessageId);
      confirmMessage(msg.conversationId, msg.clientMessageId, msg);
      removePendingOutbound(msg.clientMessageId);
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
    const handleConversationEvent = async (event) => {
      if (!event?.conversationId) return;

      const store = useChatStore.getState();
      store.applyGroupRealtimeEvent(event, user.id);

      const currentUserIsTarget = (event.targetUserIds || [])
        .some((userId) => Number(userId) === Number(user.id));
      const removedForCurrentUser = currentUserIsTarget
        && ['GROUP_MEMBER_REMOVED', 'GROUP_MEMBER_LEFT'].includes(event.type);

      if (removedForCurrentUser) return;

      const shouldRefreshDetail = [
        'GROUP_MEMBERS_ADDED',
        'GROUP_MEMBER_REMOVED',
        'GROUP_MEMBER_LEFT',
        'GROUP_MEMBER_ROLE_UPDATED'
      ].includes(event.type);

      if (!shouldRefreshDetail) return;

      try {
        const detail = await chatApi.getConversationDetail(event.conversationId);
        const latest = useChatStore.getState();
        const existingConversation = latest.conversations.find((conversation) =>
          Number(conversation.id) === Number(detail.id)
        );

        latest.upsertConversation({
          id: detail.id,
          name: detail.name || existingConversation?.name || `Conversation ${detail.id}`,
          avatar: detail.avatarUrl ?? existingConversation?.avatar ?? null,
          unread: existingConversation?.unread ?? 0,
          type: detail.type,
          isGroup: detail.type === 'groups_chat',
          lastMessage: existingConversation?.lastMessage ?? '',
          lastMessageId: existingConversation?.lastMessageId ?? null,
          updatedAt: existingConversation?.updatedAt ?? event.occurredAt ?? null
        });

        if (Number(latest.activeConversationDetail?.id) === Number(detail.id)) {
          latest.setActiveConversationDetail(detail);
        }
      } catch (error) {
        console.error('[WebSocketBridge] refresh conversation event failed:', error);
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
    wsService.subscribe('/user/queue/conversations.events', handleConversationEvent);

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
      wsService.unsubscribe('/user/queue/conversations.events', handleConversationEvent);
    };
  }, [isConnected, user, processIncomingMessage, clearAckTimer, clearOutboundInFlight, confirmMessage, removePendingOutbound, updateConversationFromMessage, updateMessageStatus, applyGroupRealtimeEvent, wsService]);

  useEffect(() => {
    if (connectCount === 0 || !user || !isConnected) return;

    const resendPendingAfterReconnect = async () => {
      const currentAttemptKey = wsService.connectCount ?? connectCount;
      if (currentAttemptKey <= 1 || isResendingPendingRef.current) return;
      if (!wsService.isConnected?.()) return;

      const hasPending = Object.keys(useChatStore.getState().pendingOutbound).length > 0;
      if (!hasPending) return;

      isResendingPendingRef.current = true;
      try {
        await resendPendingMessagesAfterReconnect({
          wsService,
          isConnected: () => Boolean(wsService.isConnected?.()),
          attemptKey: currentAttemptKey
        });
      } finally {
        isResendingPendingRef.current = false;
      }
    };

    const processMissedMessages = (missedMessages) => {
      if (missedMessages.length === 0) return;

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
    };

    const runSyncCycle = async (syncCount) => {
      let hasTriggeredResend = false;
      const triggerResendOnce = () => {
        if (hasTriggeredResend) return;
        hasTriggeredResend = true;
        void resendPendingAfterReconnect();
      };

      for (let attemptIndex = 0; attemptIndex < SYNC_RETRY_MAX_ATTEMPTS; attemptIndex += 1) {
        if (!isCurrentSyncConnection(syncCount)) return;

        try {
          console.debug(`[ChatSync] attempt ${attemptIndex + 1}`);
          const missedMessages = await fetchAllMissedMessages();

          if (!isCurrentSyncConnection(syncCount)) return;

          processMissedMessages(missedMessages);
          triggerResendOnce();
          cancelSyncRetryWait();
          console.debug('[ChatSync] success');
          return;
        } catch (error) {
          triggerResendOnce();

          if (!isCurrentSyncConnection(syncCount)) return;

          if (!isRetryableSyncError(error)) {
            const status = error?.response?.status ?? 'unknown';
            console.error(`[ChatSync] non-retryable ${status}`, error);
            return;
          }

          if (attemptIndex >= SYNC_RETRY_MAX_ATTEMPTS - 1) {
            console.error('[ChatSync] retries exhausted', error);
            return;
          }

          const delayMs = getSyncRetryDelayMs(attemptIndex);
          console.warn(`[ChatSync] retry in ${delayMs}ms`, error);

          const shouldRetry = await waitForSyncRetry(delayMs, syncCount);
          if (!shouldRetry) return;
        }
      }
    };

    const runSync = async () => {
      if (isSyncingRef.current) {
        pendingSyncCountRef.current = Math.max(pendingSyncCountRef.current, connectCount);
        return;
      }

      isSyncingRef.current = true;
      let currentSyncCount = connectCount;

      try {
        while (syncMountedRef.current && wsService.isConnected?.()) {
          pendingSyncCountRef.current = 0;
          await runSyncCycle(currentSyncCount);

          if (pendingSyncCountRef.current > currentSyncCount) {
            currentSyncCount = pendingSyncCountRef.current;
          } else {
            break;
          }
        }
      } finally {
        cancelSyncRetryWait();
        isSyncingRef.current = false;
        pendingSyncCountRef.current = 0;
      }
    };

    runSync();
  }, [cancelSyncRetryWait, connectCount, isConnected, isCurrentSyncConnection, processIncomingMessage, user, waitForSyncRetry, wsService]);

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
      useChatStore.getState().clearPendingOutbound();
      wsService.disconnect();
      setIsConnected(false);
      setConnectCount(0);
    }

    return () => {
      useChatStore.getState().clearPendingOutbound();
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

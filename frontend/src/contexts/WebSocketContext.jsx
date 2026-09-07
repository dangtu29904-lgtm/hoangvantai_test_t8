import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { wsService } from '../services/websocket/stompClient';
import useChatStore from '../store/chatStore';
import { chatApi, securityApi } from '../services/api';
import { resendPendingMessagesAfterReconnect } from '../services/websocket/chatReliability';
import {
  flushPendingDeliveredAcks,
  queueAndSendDeliveredAck
} from '../services/websocket/deliveredReliability';
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

const LoginApprovalPrompt = ({ request, loading, onApprove, onReject, onClose }) => (
  <div className="fixed right-5 top-20 z-[70] w-[360px] overflow-hidden rounded-2xl border border-[#3e4042] bg-[#242526] text-[#e4e6eb] shadow-2xl">
    <div className="border-b border-[#3e4042] px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8ab4f8]">Security login</p>
      <h3 className="mt-1 text-lg font-black text-white">Thiet bi moi muon dang nhap</h3>
    </div>
    <div className="space-y-3 p-4 text-sm">
      <p className="leading-6 text-[#b0b3b8]">
        Co yeu cau dang nhap tu <span className="font-bold text-white">{request.deviceName || 'thiet bi moi'}</span>.
        Hay chi cho phep neu day la ban.
      </p>
      <div className="rounded-xl bg-[#18191a] p-3">
        <div className="flex items-center justify-between">
          <span>Risk score</span>
          <strong className="text-amber-300">{request.riskScore}</strong>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>Browser</span>
          <strong>{request.browser || 'Unknown'}</strong>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>OS</span>
          <strong>{request.os || 'Unknown'}</strong>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>IP</span>
          <strong>{request.ipAddress || 'Unknown'}</strong>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onReject}
          disabled={loading}
          className="rounded-xl bg-[#3a3b3c] px-4 py-2.5 font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
        >
          Tu choi
        </button>
        <button
          onClick={onApprove}
          disabled={loading}
          className="rounded-xl bg-[#1877f2] px-4 py-2.5 font-bold text-white transition hover:bg-[#166fe5] disabled:opacity-50"
        >
          Cho phep
        </button>
      </div>
      <button onClick={onClose} className="w-full rounded-xl px-4 py-2 text-xs font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c]">
        De sau
      </button>
    </div>
  </div>
);

const WebSocketEventBridge = ({ children, isConnected, connectCount, wsService }) => {
  const { user } = useAuth();
  const addMessage = useChatStore(state => state.addMessage);
  const confirmMessage = useChatStore(state => state.confirmMessage);
  const clearAckTimer = useChatStore(state => state.clearAckTimer);
  const clearOutboundInFlight = useChatStore(state => state.clearOutboundInFlight);
  const removePendingOutbound = useChatStore(state => state.removePendingOutbound);
  const updateMessageStatus = useChatStore(state => state.updateMessageStatus);
  const updatePendingOutboundStatus = useChatStore(state => state.updatePendingOutboundStatus);
  const markMessageFailedByClientMessageId = useChatStore(state => state.markMessageFailedByClientMessageId);
  const updateConversationFromMessage = useChatStore(state => state.updateConversationFromMessage);
  const markConversationSeen = useChatStore(state => state.markConversationSeen);
  const applyGroupRealtimeEvent = useChatStore(state => state.applyGroupRealtimeEvent);

  const isSyncingRef = useRef(false);
  const pendingSyncCountRef = useRef(0);
  const isResendingPendingRef = useRef(false);
  const syncRetryWaitRef = useRef(null);
  const syncMountedRef = useRef(true);
  const [loginApprovals, setLoginApprovals] = useState([]);
  const [approvalActionLoading, setApprovalActionLoading] = useState(false);

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

      if (isViewingConversation && source === 'realtime') {
        wsService.send('/app/chat.seenConversation', { conversationId });
        markConversationSeen(conversationId);
      }
    }

    if (!isOwnMessage) {
      queueAndSendDeliveredAck(msg, user?.id, {
        wsService,
        isConnected: () => Boolean(wsService.isConnected?.())
      });
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
    const handleChatError = (error) => {
      if (!error?.clientMessageId) {
        console.warn('[chat] websocket error', error);
        return;
      }

      const store = useChatStore.getState();
      const pending = store.pendingOutbound[error.clientMessageId];
      const conversationId = error.conversationId ?? pending?.conversationId;

      store.clearAckTimer(error.clientMessageId);
      store.clearOutboundInFlight(error.clientMessageId);

      if (conversationId) {
        markMessageFailedByClientMessageId(conversationId, error.clientMessageId, error.message);
      }
      updatePendingOutboundStatus(error.clientMessageId, 'failed', error.message);
    };
    const handleLoginApproval = (event) => {
      if (!event?.approvalRequestId) return;
      setLoginApprovals((current) => {
        const exists = current.some((item) => item.approvalRequestId === event.approvalRequestId);
        return exists ? current : [event, ...current].slice(0, 3);
      });
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
    wsService.subscribe('/user/queue/errors', handleChatError);
    wsService.subscribe('/user/queue/security.login-approvals', handleLoginApproval);

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
      wsService.unsubscribe('/user/queue/errors', handleChatError);
      wsService.unsubscribe('/user/queue/security.login-approvals', handleLoginApproval);
    };
  }, [isConnected, user, processIncomingMessage, clearAckTimer, clearOutboundInFlight, confirmMessage, removePendingOutbound, updateConversationFromMessage, updateMessageStatus, updatePendingOutboundStatus, markMessageFailedByClientMessageId, applyGroupRealtimeEvent, wsService]);

  useEffect(() => {
    if (connectCount === 0 || !user || !isConnected) return;

    const resendPendingAfterReconnect = async () => {
      const currentAttemptKey = wsService.connectCount ?? connectCount;
      if (isResendingPendingRef.current) return;
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

    const flushDeliveredAfterReconnect = () => {
      if (!wsService.isConnected?.()) return;
      flushPendingDeliveredAcks({
        wsService,
        isConnected: () => Boolean(wsService.isConnected?.())
      });
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
          flushDeliveredAfterReconnect();
          const missedMessages = await fetchAllMissedMessages();

          if (!isCurrentSyncConnection(syncCount)) return;

          processMissedMessages(missedMessages);
          flushDeliveredAfterReconnect();
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
      // kiem tra co sync dang chay hay khong, neu co thi chi cap nhat connectCount va thoat
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

  const activeLoginApproval = loginApprovals[0] || null;

  const removeActiveLoginApproval = useCallback(() => {
    if (!activeLoginApproval) return;
    setLoginApprovals((current) => current.filter((item) =>
      item.approvalRequestId !== activeLoginApproval.approvalRequestId
    ));
  }, [activeLoginApproval]);

  const approveActiveLogin = useCallback(async () => {
    if (!activeLoginApproval) return;
    setApprovalActionLoading(true);
    try {
      await securityApi.approveLogin(activeLoginApproval.approvalRequestId);
      removeActiveLoginApproval();
    } catch (error) {
      console.error('[security] approve login failed:', error);
    } finally {
      setApprovalActionLoading(false);
    }
  }, [activeLoginApproval, removeActiveLoginApproval]);

  const rejectActiveLogin = useCallback(async () => {
    if (!activeLoginApproval) return;
    setApprovalActionLoading(true);
    try {
      await securityApi.rejectLogin(activeLoginApproval.approvalRequestId);
      removeActiveLoginApproval();
    } catch (error) {
      console.error('[security] reject login failed:', error);
    } finally {
      setApprovalActionLoading(false);
    }
  }, [activeLoginApproval, removeActiveLoginApproval]);

  return (
    <>
      {children}
      {activeLoginApproval && (
        <LoginApprovalPrompt
          request={activeLoginApproval}
          loading={approvalActionLoading}
          onApprove={approveActiveLogin}
          onReject={rejectActiveLogin}
          onClose={removeActiveLoginApproval}
        />
      )}
    </>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  // Incremented on every successful STOMP connect (1 = first, 2+ = reconnect)
  const [connectCount, setConnectCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && token) {
      if (user?.id) {
        useChatStore.getState().hydratePendingOutboundForUser(user.id);
        useChatStore.getState().hydratePendingDeliveredForUser(user.id);
      }
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
      useChatStore.getState().clearPendingDelivered();
      wsService.disconnect();
      setIsConnected(false);
      setConnectCount(0);
    }

    return () => {
      useChatStore.getState().pausePendingOutbound();
      useChatStore.getState().pausePendingDelivered();
      wsService.disconnect();
    };
  }, [token, isAuthenticated, user?.id]);

  return (
    <WebSocketContext.Provider value={{ isConnected, connectCount, wsService }}>
      <WebSocketEventBridge isConnected={isConnected} connectCount={connectCount} wsService={wsService}>
        {children}
      </WebSocketEventBridge>
    </WebSocketContext.Provider>
  );
};

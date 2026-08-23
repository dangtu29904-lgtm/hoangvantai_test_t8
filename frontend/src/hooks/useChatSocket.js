import { useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import useChatStore from '../store/chatStore';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../services/api';

// ─── Sync helpers ──────────────────────────────────────────────────────────

/**
 * Fetch ALL missed messages from /user/chat/sync using cursor pagination.
 * Returns flat list of message objects, ordered by id ASC (as backend guarantees).
 * Guards against infinite loops: breaks if nextAfterMessageId doesn't advance.
 */
async function fetchAllMissedMessages() {
  const allMessages = [];
  let afterMessageId = null;
  let safetyLimit = 50; // max pages — prevents runaway loop

  while (safetyLimit-- > 0) {
    const response = await chatApi.syncMessages(afterMessageId, 100);
    const items = response.items ?? [];

    allMessages.push(...items);

    if (!response.hasMore) break;

    const next = response.nextAfterMessageId ?? null;
    // Guard: if cursor didn't advance, break to avoid infinite loop
    if (next === null || next === afterMessageId) {
      console.warn('[SyncMessages] nextAfterMessageId did not advance, stopping pagination.');
      break;
    }
    afterMessageId = next;
  }

  return allMessages;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

const useChatSocket = () => {
  const { isConnected, connectCount, wsService } = useWebSocket();
  const { user } = useAuth();

  const viewingConversationId = useChatStore(state => state.viewingConversationId);
  const addMessage = useChatStore(state => state.addMessage);
  const confirmMessage = useChatStore(state => state.confirmMessage);
  const updateMessageStatus = useChatStore(state => state.updateMessageStatus);
  const updateConversationFromMessage = useChatStore(state => state.updateConversationFromMessage);

  // Prevents two sync processes running at the same time (e.g., rapid reconnects)
  const isSyncingRef = useRef(false);

  // ── Realtime subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !user) return;

    const handleNewMessage = (msg) => {
      const conversationId = msg.conversationId;
      const isViewingConversation = viewingConversationId === conversationId;

      addMessage(conversationId, { ...msg, status: 'delivered' });
      updateConversationFromMessage(conversationId, msg, {
        unreadDelta: isViewingConversation ? 0 : 1,
        resetUnread: isViewingConversation,
      });

      wsService.send('/app/chat.delivered', { messageId: msg.id });
      if (isViewingConversation) {
        wsService.send('/app/chat.seenConversation', { conversationId });
      }
    };

    const handleAck = (msg) => {
      confirmMessage(msg.conversationId, msg.clientMessageId, msg);
      updateConversationFromMessage(msg.conversationId, msg, {
        unreadDelta: 0,
        resetUnread: true,
      });
    };

    const handleDelivered = (res) => {
      updateMessageStatus(res.conversationId, res.messageId, 'delivered');
    };

    const handleSeen = (res) => {
      if (res.messageIds && Array.isArray(res.messageIds)) {
        res.messageIds.forEach(id => {
          updateMessageStatus(res.conversationId, id, 'seen');
        });
      } else if (res.messageId) {
        updateMessageStatus(res.conversationId, res.messageId, 'seen');
      }

      if (res.conversationId) {
        useChatStore.getState().markConversationSeen(res.conversationId);
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
  }, [isConnected, user, viewingConversationId, addMessage, confirmMessage, updateConversationFromMessage, updateMessageStatus, wsService]);

  // ── Sync missed messages after reconnect ──────────────────────────────
  useEffect(() => {
    // connectCount=0: not yet connected
    // connectCount=1: first connect → no sync needed (normal page load)
    // connectCount=2+: reconnect after disconnect → sync missed messages
    if (connectCount <= 1) return;
    if (!user || !isConnected) return;

    if (isSyncingRef.current) {
      console.log('[SyncMessages] Sync already in progress, skipping this reconnect.');
      return;
    }

    const runSync = async () => {
      isSyncingRef.current = true;
      console.log(`[SyncMessages] Starting sync after reconnect (connectCount=${connectCount})`);

      try {
        const missedMessages = await fetchAllMissedMessages();
        console.log(`[SyncMessages] Fetched ${missedMessages.length} missed message(s).`);

        if (missedMessages.length === 0) return;

        // Read viewingConversationId from store directly — avoids stale closure
        const currentViewingId = useChatStore.getState().viewingConversationId;

        // Group messages by conversationId for efficient batch processing
        const byConversation = new Map();
        for (const msg of missedMessages) {
          const cid = msg.conversationId;
          if (!byConversation.has(cid)) byConversation.set(cid, []);
          byConversation.get(cid).push(msg);
        }

        for (const [conversationId, msgs] of byConversation) {
          const isViewing = currentViewingId === conversationId;

          for (const msg of msgs) {
            // addMessage has built-in dedup logic:
            //   skips if message.id already in store,
            //   OR if non-temp message with same clientMessageId already exists.
            // This handles the race condition where WebSocket also delivered the same message.
            addMessage(conversationId, { ...msg, status: 'delivered' });

            // Update conversation list preview; increment unread only for background convos
            updateConversationFromMessage(conversationId, msg, {
              unreadDelta: isViewing ? 0 : 1,
              resetUnread: isViewing,
            });

            // Send delivered acknowledgement — only for messages from OTHER users
            if (msg.senderId !== user.id) {
              wsService.send('/app/chat.delivered', { messageId: msg.id });
            }
          }

          // If user is currently viewing this conversation, also mark it as seen
          if (isViewing) {
            wsService.send('/app/chat.seenConversation', { conversationId });
            useChatStore.getState().markConversationSeen(conversationId);
          }
        }
      } catch (err) {
        console.error('[SyncMessages] Sync failed:', err);
        // Safe failure: WebSocket stays connected, UI is intact, next reconnect will retry
      } finally {
        isSyncingRef.current = false;
      }
    };

    runSync();
    // Only re-run when connectCount changes (= new reconnect happened)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectCount]);

  // ── Chat actions ───────────────────────────────────────────────────────

  const sendMessage = (conversationId, content, clientMessageId, replyToMessageId = null, uploadIds = []) => {
    if (!isConnected) return false;
    wsService.send('/app/chat.send', { conversationId, content, clientMessageId, replyToMessageId, uploadIds });
    return true;
  };

  const markAsSeen = (messageId) => {
    if (isConnected) wsService.send('/app/chat.seen', { messageId });
  };

  const markConversationAsSeen = (conversationId) => {
    if (isConnected) wsService.send('/app/chat.seenConversation', { conversationId });
  };

  const editMessage = (messageId, content) => wsService.send('/app/chat.edit', { messageId, content });
  const recallMessage = (messageId) => wsService.send('/app/chat.recall', { messageId });
  const deleteMessageForMe = (messageId) => wsService.send('/app/chat.deleteForMe', { messageId });
  const reactToMessage = (messageId, type) => wsService.send('/app/chat.react', { messageId, type });

  const setTyping = useCallback((conversationId, typing) => {
    if (isConnected) wsService.send('/app/chat.typing', { conversationId, typing });
  }, [isConnected, wsService]);

  return { isConnected, sendMessage, markAsSeen, markConversationAsSeen, editMessage, recallMessage, deleteMessageForMe, reactToMessage, setTyping };
};

export default useChatSocket;

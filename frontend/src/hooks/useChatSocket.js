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
  const hasMessage = useChatStore(state => state.hasMessage);

  // Prevents two sync processes running at the same time
  const isSyncingRef = useRef(false);
  const pendingSyncCountRef = useRef(0);

  // ── Unified Message Processor ──────────────────────────────────────────
  const processIncomingMessage = useCallback((msg, source) => {
    const conversationId = msg.conversationId;
    const isViewingConversation = useChatStore.getState().viewingConversationId === conversationId;
    
    // Check if duplicate FIRST
    const isDuplicate = useChatStore.getState().hasMessage(conversationId, msg);

    if (!isDuplicate) {
      // 1. Add message (bubble)
      addMessage(conversationId, { ...msg, status: 'delivered' });
      
      // 2. Update conversation preview and unread (only once)
      updateConversationFromMessage(conversationId, msg, {
        unreadDelta: isViewingConversation ? 0 : 1,
        resetUnread: isViewingConversation,
      });

      // 3. Send delivered for OTHER users
      if (user && msg.senderId !== user.id) {
        wsService.send('/app/chat.delivered', { messageId: msg.id });
      }

      // 4. Send seen if viewing
      if (isViewingConversation && source === 'realtime') {
        wsService.send('/app/chat.seenConversation', { conversationId });
      }
    } else {
      // If duplicate, don't increment unread or add bubble,
      // but if it's from sync and we haven't sent delivered yet (in a rare race), we could resend.
      // Usually, it's safe to just ignore to prevent spamming backend.
    }
    
    return !isDuplicate; // Return true if it was newly inserted
  }, [addMessage, updateConversationFromMessage, user, wsService]);

  // ── Realtime subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !user) return;

    const handleNewMessage = (msg) => {
      processIncomingMessage(msg, 'realtime');
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
      // SeenConversationResponse: { conversationId, recipientId, messageIds: [id1, id2...], seenAt }
      // SeenResponse (single):    { messageId, conversationId, recipientId, seenAt }
      // In both cases, we update the status of those messages to 'seen' for the SENDER (current user)
      const cid = res.conversationId;
      if (res.messageIds && Array.isArray(res.messageIds) && res.messageIds.length > 0) {
        res.messageIds.forEach(id => {
          updateMessageStatus(cid, id, 'seen');
        });
      } else if (res.messageId) {
        updateMessageStatus(cid, res.messageId, 'seen');
      }
      // NOTE: do NOT call markConversationSeen here — this event is for the SENDER (A)
      // to know that recipient (B) has read messages. Unread count belongs to B, not A.
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

  // ── Sync missed messages after ANY connect (including first) ──────────
  useEffect(() => {
    // connectCount=0 means not yet connected; >0 means connected
    if (connectCount === 0) return;
    if (!user || !isConnected) return;

    const runSync = async () => {
      if (isSyncingRef.current) {
        console.log(`[SyncMessages] Sync already in progress, queuing reconnect #${connectCount}`);
        pendingSyncCountRef.current = connectCount;
        return;
      }

      isSyncingRef.current = true;
      let currentSyncCount = connectCount;

      try {
        while (true) {
          console.log(`[SyncMessages] Starting sync (target connectCount=${currentSyncCount})`);
          const missedMessages = await fetchAllMissedMessages();
          console.log(`[SyncMessages] Fetched ${missedMessages.length} missed message(s).`);

          if (missedMessages.length > 0) {
            const currentViewingId = useChatStore.getState().viewingConversationId;
            const seenConversationIds = new Set();

            for (const msg of missedMessages) {
              const inserted = processIncomingMessage(msg, 'sync');
              if (inserted && currentViewingId === msg.conversationId) {
                seenConversationIds.add(msg.conversationId);
              }
            }

            // Batch seenConversation calls per conversation
            for (const cid of seenConversationIds) {
              wsService.send('/app/chat.seenConversation', { conversationId: cid });
              useChatStore.getState().markConversationSeen(cid);
            }
          }

          // Check if another reconnect happened while we were syncing
          if (pendingSyncCountRef.current > currentSyncCount) {
            console.log(`[SyncMessages] Found pending sync request, restarting sync.`);
            currentSyncCount = pendingSyncCountRef.current;
          } else {
            break; // No pending sync, we're done
          }
        }
      } catch (err) {
        console.error('[SyncMessages] Sync failed:', err);
      } finally {
        isSyncingRef.current = false;
        pendingSyncCountRef.current = 0;
      }
    };

    runSync();
  }, [connectCount, isConnected, processIncomingMessage, user, wsService]);

  // ── Actions ────────────────────────────────────────────────────────────

  const sendMessage = (conversationId, content, clientMessageId, replyToMessageId = null, uploadIds = []) => {
    if (!isConnected) return false;

    wsService.send('/app/chat.send', {
      conversationId,
      content,
      clientMessageId,
      replyToMessageId,
      uploadIds
    });
    return true;
  };

  const markAsSeen = (messageId) => {
    if (isConnected) {
      wsService.send('/app/chat.seen', { messageId });
    }
  };

  const markConversationAsSeen = (conversationId) => {
    if (isConnected) {
      wsService.send('/app/chat.seenConversation', { conversationId });
    }
  };

  const editMessage = (messageId, content) => wsService.send('/app/chat.edit', { messageId, content });
  const recallMessage = (messageId) => wsService.send('/app/chat.recall', { messageId });
  const deleteMessageForMe = (messageId) => wsService.send('/app/chat.deleteForMe', { messageId });
  const reactToMessage = (messageId, type) => wsService.send('/app/chat.react', { messageId, type });
  const setTyping = useCallback((conversationId, typing) => {
    if (isConnected) {
      wsService.send('/app/chat.typing', { conversationId, typing });
    }
  }, [isConnected, wsService]);

  return { isConnected, sendMessage, markAsSeen, markConversationAsSeen, editMessage, recallMessage, deleteMessageForMe, reactToMessage, setTyping };
};

export default useChatSocket;


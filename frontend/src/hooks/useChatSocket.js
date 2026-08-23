import { useCallback, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import useChatStore from '../store/chatStore';
import { useAuth } from '../contexts/AuthContext';

const useChatSocket = () => {
  const { isConnected, wsService } = useWebSocket();
  const { user } = useAuth();

  const viewingConversationId = useChatStore(state => state.viewingConversationId);
  const addMessage = useChatStore(state => state.addMessage);
  const confirmMessage = useChatStore(state => state.confirmMessage);
  const updateMessageStatus = useChatStore(state => state.updateMessageStatus);
  const updateConversationFromMessage = useChatStore(state => state.updateConversationFromMessage);

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

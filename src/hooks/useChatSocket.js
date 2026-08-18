import { useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import useChatStore from '../store/chatStore';
import { useAuth } from '../contexts/AuthContext';

const useChatSocket = () => {
  const { isConnected, wsService } = useWebSocket();
  const { user } = useAuth();

  const activeConversation = useChatStore(state => state.activeConversation);
  const addMessage = useChatStore(state => state.addMessage);
  const confirmMessage = useChatStore(state => state.confirmMessage);
  const updateMessageStatus = useChatStore(state => state.updateMessageStatus);
  const updateConversationFromMessage = useChatStore(state => state.updateConversationFromMessage);

  useEffect(() => {
    if (!isConnected || !user) return;

    const handleNewMessage = (msg) => {
      const conversationId = msg.conversationId;
      const isCurrentConversation = activeConversation?.id === conversationId;

      addMessage(conversationId, { ...msg, status: 'delivered' });
      updateConversationFromMessage(conversationId, msg, {
        unreadDelta: isCurrentConversation ? 0 : 1,
        resetUnread: isCurrentConversation,
      });

      if (!isCurrentConversation) {
        wsService.send('/app/chat.delivered', { messageId: msg.id });
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

    wsService.subscribe('/user/queue/messages', handleNewMessage);
    wsService.subscribe('/user/queue/messages.ack', handleAck);
    wsService.subscribe('/user/queue/messages.delivered', handleDelivered);
    wsService.subscribe('/user/queue/messages.seen', handleSeen);
    wsService.subscribe('/user/queue/presence', handlePresence);

    return () => {
      wsService.unsubscribe('/user/queue/messages', handleNewMessage);
      wsService.unsubscribe('/user/queue/messages.ack', handleAck);
      wsService.unsubscribe('/user/queue/messages.delivered', handleDelivered);
      wsService.unsubscribe('/user/queue/messages.seen', handleSeen);
      wsService.unsubscribe('/user/queue/presence', handlePresence);
    };
  }, [isConnected, user, activeConversation?.id, addMessage, confirmMessage, updateConversationFromMessage, updateMessageStatus, wsService]);

  const sendMessage = (conversationId, content, clientMessageId) => {
    if (!isConnected) return false;

    wsService.send('/app/chat.send', {
      conversationId,
      content,
      clientMessageId
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

  return { sendMessage, markAsSeen, markConversationAsSeen };
};

export default useChatSocket;

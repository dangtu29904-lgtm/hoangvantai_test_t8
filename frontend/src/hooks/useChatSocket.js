import { useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import useChatStore from '../store/chatStore';
import { sendPendingMessage } from '../services/websocket/chatReliability';

const useChatSocket = () => {
  const { isConnected, connectCount, wsService } = useWebSocket();

  const sendMessage = useCallback((conversationId, content, clientMessageId, replyToMessageId = null, uploadIds = []) => {
    const pending = useChatStore.getState().pendingOutbound[clientMessageId];
    if (pending) {
      return sendPendingMessage(clientMessageId, {
        wsService,
        isConnected,
        allowSending: true,
        attemptKey: connectCount
      });
    }

    return wsService.send('/app/chat.send', {
      conversationId,
      content,
      clientMessageId,
      replyToMessageId,
      uploadIds
    });
  }, [connectCount, isConnected, wsService]);

  const retryMessage = useCallback((clientMessageId) => {
    return sendPendingMessage(clientMessageId, {
      wsService,
      isConnected,
      allowSending: false,
      attemptKey: connectCount
    });
  }, [connectCount, isConnected, wsService]);

  const markAsSeen = useCallback((messageId) => {
    if (isConnected) {
      wsService.send('/app/chat.seen', { messageId });
    }
  }, [isConnected, wsService]);

  const markConversationAsSeen = useCallback((conversationId) => {
    if (isConnected) {
      wsService.send('/app/chat.seenConversation', { conversationId });
    }
  }, [isConnected, wsService]);

  const editMessage = useCallback((messageId, content) => wsService.send('/app/chat.edit', { messageId, content }), [wsService]);
  const recallMessage = useCallback((messageId) => wsService.send('/app/chat.recall', { messageId }), [wsService]);
  const deleteMessageForMe = useCallback((messageId) => wsService.send('/app/chat.deleteForMe', { messageId }), [wsService]);
  const reactToMessage = useCallback((messageId, type) => wsService.send('/app/chat.react', { messageId, type }), [wsService]);
  const setTyping = useCallback((conversationId, typing) => {
    if (isConnected) {
      wsService.send('/app/chat.typing', { conversationId, typing });
    }
  }, [isConnected, wsService]);

  return {
    isConnected,
    connectCount,
    wsService,
    sendMessage,
    retryMessage,
    markAsSeen,
    markConversationAsSeen,
    editMessage,
    recallMessage,
    deleteMessageForMe,
    reactToMessage,
    setTyping
  };
};

export default useChatSocket;

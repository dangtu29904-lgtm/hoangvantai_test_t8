import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Smile, Paperclip } from 'lucide-react';
import useChatSocket from '../../hooks/useChatSocket';
import useChatStore, { createTempMessage } from '../../store/chatStore';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';

const Composer = ({ conversationId }) => {
  const [content, setContent] = useState('');
  const { sendMessage } = useChatSocket();
  const addTempMessage = useChatStore(state => state.addTempMessage);
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleSend = () => {
    const trimmed = content.trim();
    if (!trimmed || !isConnected || !user) return;

    // 1. Create temporary message for optimistic UI
    const tempMsg = createTempMessage(trimmed, conversationId, user.id);
    
    // 2. Add to local state instantly
    addTempMessage(conversationId, tempMsg);
    
    // 3. Clear input
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 4. Send via WebSocket STOMP
    sendMessage(conversationId, trimmed, tempMsg.clientMessageId);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-100">
      <div className="flex items-end bg-gray-100 rounded-2xl px-3 py-2 transition-colors focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-messenger/20">
        <button className="p-2 text-gray-500 hover:text-messenger transition-colors rounded-full hover:bg-gray-200 self-center flex-shrink-0">
          <Paperclip size={20} />
        </button>
        <button className="p-2 text-gray-500 hover:text-messenger transition-colors rounded-full hover:bg-gray-200 self-center mr-2 flex-shrink-0">
          <ImageIcon size={20} />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Aa"
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-[120px] py-2 px-1 text-[15px] outline-none text-gray-900"
          rows={1}
          disabled={!isConnected}
        />

        <button className="p-2 text-gray-500 hover:text-messenger transition-colors rounded-full hover:bg-gray-200 self-center flex-shrink-0">
          <Smile size={20} />
        </button>
        <button 
          onClick={handleSend}
          disabled={!content.trim() || !isConnected}
          className={`p-2 ml-1 transition-colors rounded-full self-center flex-shrink-0 ${
            content.trim() && isConnected
              ? 'text-messenger hover:bg-messenger/10' 
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send size={20} className={content.trim() && isConnected ? 'fill-messenger' : ''} />
        </button>
      </div>
      {!isConnected && (
        <div className="text-center mt-2 text-xs text-red-500 font-medium animate-pulse">
          Reconnecting to chat...
        </div>
      )}
    </div>
  );
};

export default Composer;

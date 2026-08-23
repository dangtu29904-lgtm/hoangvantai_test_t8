import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Smile, Paperclip, X } from 'lucide-react';
import useChatStore, { createTempMessage } from '../../store/chatStore';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { chatApi } from '../../services/api';

const Composer = ({ conversationId, sendMessage, setTyping, replyTo, onClearReply, theme = 'light' }) => {
  const [content, setContent] = useState('');
  const [uploadIds, setUploadIds] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
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

  const canSend = (Boolean(content.trim()) || uploadIds.length > 0) && isConnected && Boolean(user) && !uploading;

  const handleSend = () => {
    if (!canSend) return;
    const trimmed = content.trim();

    // 1. Create temporary message for optimistic UI
    const tempMsg = createTempMessage(trimmed, conversationId, user.id);
    if (uploadedFiles.length > 0) {
      tempMsg.attachments = uploadedFiles.map(f => ({
        attachmentId: f.uploadId,
        url: f.url,
        type: f.type,
        originalFileName: f.originalFileName
      }));
    }
    
    // 2. Add to local state instantly
    addTempMessage(conversationId, tempMsg);
    
    // 3. Clear input & attachments
    setContent('');
    setUploadIds([]);
    setUploadedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 4. Send via WebSocket STOMP
    sendMessage(conversationId, trimmed, tempMsg.clientMessageId, replyTo?.id, uploadIds);
    onClearReply?.();
    setTyping?.(conversationId, false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleContentChange = (event) => {
    const nextContent = event.target.value;
    setContent(nextContent);
    if (!setTyping || !isConnected) return;

    setTyping(conversationId, Boolean(nextContent.trim()));
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (nextContent.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(conversationId, false);
        typingTimeoutRef.current = null;
      }, 2500);
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const upload = await chatApi.uploadFile(file);
      const id = upload.uploadId || upload.id;
      if (id) {
        setUploadIds(ids => [...ids, id]);
        setUploadedFiles(files => [...files, upload]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload file thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setUploadIds(ids => ids.filter((_, i) => i !== index));
    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  useEffect(() => () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping?.(conversationId, false);
  }, [conversationId, setTyping]);

  return (
    <div className={`relative w-full shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-6 ${theme === 'dark' ? 'border-t border-white/10 bg-[#242526]' : 'border-t border-gray-100 bg-white'}`}>
      {/* File Previews */}
      {uploadedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 px-1">
          {uploadedFiles.map((file, idx) => (
            <div key={file.uploadId || idx} className="relative group flex items-center gap-2 rounded-xl bg-gray-200/80 px-3 py-1.5 text-xs text-gray-800 dark:bg-white/10 dark:text-gray-200">
              {file.type === 'IMAGE' || (file.url && file.url.match(/\.(jpeg|jpg|gif|png|webp)/i)) ? (
                <img src={file.url} alt="preview" className="h-8 w-8 rounded object-cover" />
              ) : (
                <Paperclip size={14} />
              )}
              <span className="max-w-[120px] truncate font-medium">{file.originalFileName || 'Tệp đính kèm'}</span>
              <button onClick={() => removeAttachment(idx)} className="ml-1 rounded-full p-0.5 hover:bg-black/20 text-gray-500 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`flex w-full items-end rounded-2xl px-3 py-2 transition-colors ${theme === 'dark' ? 'bg-[#3a3b3c] focus-within:bg-[#454647]' : 'bg-gray-100 focus-within:bg-gray-50 focus-within:ring-2 focus-within:ring-messenger/20'}`}>
        {replyTo && <div className="absolute bottom-full left-3 right-3 mb-2 flex items-center justify-between rounded-xl bg-white p-2 text-xs shadow"><span>Đang trả lời: {replyTo.content}</span><button onClick={onClearReply}><X size={14} /></button></div>}
        <label className="shrink-0 cursor-pointer self-center rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-messenger">
          <Paperclip size={20} />
          <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        <label className="mr-2 shrink-0 cursor-pointer self-center rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-messenger">
          <ImageIcon size={20} />
          <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onFocus={() => setTyping?.(conversationId, true)}
          onBlur={() => setTyping?.(conversationId, false)}
          onKeyDown={handleKeyDown}
          placeholder={uploading ? 'Đang tải file lên...' : 'Aa'}
          className={`max-h-30 flex-1 resize-none border-none bg-transparent px-1 py-2 text-[15px] outline-none focus:ring-0 placeholder:text-gray-500 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          rows={1}
          disabled={!isConnected || uploading}
        />

        <button className="shrink-0 self-center rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-messenger">
          <Smile size={20} />
        </button>
        <button 
          onClick={handleSend}
          disabled={!canSend}
          className={`p-2 ml-1 transition-colors rounded-full self-center shrink-0 ${
            canSend
              ? 'text-messenger hover:bg-messenger/10' 
              : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send size={20} className={canSend ? 'fill-messenger' : ''} />
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

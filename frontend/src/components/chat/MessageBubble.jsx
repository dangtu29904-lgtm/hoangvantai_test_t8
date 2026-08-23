import React, { useState } from 'react';
import { CheckCircle2, Circle, Ellipsis, MessageSquareReply, Pencil, RotateCcw, Smile, Trash2 } from 'lucide-react';

const MessageBubble = ({ message, isMine, showAvatar, avatar, onEdit, onRecall, onDelete, onReact, onReply, theme = 'light' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const getStatusIcon = () => {
    if (!isMine) return null;
    
    switch (message.status) {
      case 'sending':
        return <Circle size={12} className="text-gray-300 ml-1" />;
      case 'sent':
        return <CheckCircle2 size={12} className="text-gray-400 ml-1" />;
      case 'delivered':
        return <CheckCircle2 size={12} className="text-messenger ml-1" fill="white" />;
      case 'seen':
        // Display avatar thumbnail for seen
        return (
          <div className="h-3.5 w-3.5 rounded-full bg-gray-300 ml-1 overflow-hidden">
             {typeof avatar === 'string' && avatar.length === 1 ? (
                <span className="text-[8px] flex items-center justify-center h-full w-full bg-messenger text-white">{avatar}</span>
             ) : (
                <img src={avatar} alt="seen" className="h-full w-full object-cover" />
             )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex w-full px-1 py-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine && (
        <div className="mr-2 h-7 w-7 shrink-0">
          {showAvatar ? (
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#4b4b4b] text-xs font-medium text-white shadow-sm">
              {typeof avatar === 'string' && avatar.length === 1 ? avatar : <img src={avatar} alt="" className="h-full w-full object-cover" />}
            </div>
          ) : (
            <div className="h-7 w-7" /> // Placeholder to align messages without avatar
          )}
        </div>
      )}

      <div className="group relative flex max-w-[min(72%,680px)] items-end">
          <button onClick={() => setMenuOpen(value => !value)} className={`order-last ml-1 rounded-full p-1 opacity-0 transition group-hover:opacity-100 ${theme === 'dark' ? 'text-gray-400 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'}`}><Ellipsis size={15} /></button>
        {menuOpen && <div className={`absolute bottom-full right-0 z-20 mb-1 flex items-center gap-1 rounded-xl p-1 shadow-lg ${theme === 'dark' ? 'bg-[#3a3b3c]' : 'border border-gray-200 bg-white'}`}>
          {isMine && !message.recalledAt && <button title="Sửa" onClick={() => { onEdit?.(message); setMenuOpen(false); }} className="rounded-lg p-2 text-gray-300 hover:bg-white/10"><Pencil size={14} /></button>}
          {isMine && !message.recalledAt && <button title="Thu hồi" onClick={() => { onRecall?.(message.id); setMenuOpen(false); }} className="rounded-lg p-2 text-gray-300 hover:bg-white/10"><RotateCcw size={14} /></button>}
          <button title="Xóa ở phía tôi" onClick={() => { onDelete?.(message.id); setMenuOpen(false); }} className="rounded-lg p-2 text-gray-300 hover:bg-white/10"><Trash2 size={14} /></button>
          <button title="Thả cảm xúc" onClick={() => { onReact?.(message.id, 'LIKE'); setMenuOpen(false); }} className="rounded-lg p-2 text-gray-300 hover:bg-white/10"><Smile size={14} /></button>
          <button title="Trả lời" onClick={() => { onReply?.(message); setMenuOpen(false); }} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"><MessageSquareReply size={14} /></button>
        </div>}
        <div
          className={`px-4 py-2 rounded-2xl relative ${
            isMine 
              ? 'rounded-br-md bg-messenger text-white'
                : theme === 'dark' ? 'rounded-bl-md bg-[#3a3b3c] text-[#e4e6eb]' : 'rounded-bl-md bg-gray-100 text-gray-900'
          }`}
        >
          {message.replyTo && <div className={`mb-1 rounded-xl px-2 py-1 text-xs ${isMine ? 'bg-blue-600/70 text-white/80' : theme === 'dark' ? 'bg-[#454647] text-gray-300' : 'bg-gray-200 text-gray-600'}`}>{message.replyTo.senderName}: {message.replyTo.content}</div>}
          {(message.content || message.recalledAt) && (
            <p className="text-[15px] whitespace-pre-wrap wrap-break-word leading-relaxed">
              {message.recalledAt ? 'Tin nhắn đã được thu hồi' : message.content}
            </p>
          )}
          {message.attachments?.map(attachment => {
            const isImg = attachment.type === 'IMAGE' || attachment.type === 'image' || (attachment.contentType && attachment.contentType.startsWith('image/')) || (attachment.url && /\.(jpg|jpeg|png|webp|gif|svg)/i.test(attachment.url));
            return isImg ? (
              <a key={attachment.attachmentId || attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block">
                <img src={attachment.url} alt={attachment.originalFileName || 'Image'} className="max-h-60 max-w-full rounded-xl object-cover hover:opacity-95 transition-opacity" />
              </a>
            ) : (
              <a key={attachment.attachmentId || attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline opacity-90">{attachment.originalFileName || attachment.type}</a>
            );
          })}
          {message.editedAt && !message.recalledAt && <span className="ml-1 text-[10px] opacity-60">Đã chỉnh sửa</span>}
        </div>
        {message.reactions?.length > 0 && <span className="absolute -bottom-2 right-2 rounded-full bg-white px-1.5 py-0.5 text-xs shadow">{message.reactions.map(reaction => reaction.type === 'LOVE' ? '❤' : '👍').join('')}</span>}
        
        {/* Status indicators */}
        <div className="mb-1 ml-1 flex min-w-4 items-center self-end">
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

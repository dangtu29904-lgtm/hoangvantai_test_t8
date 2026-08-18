import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';

const MessageBubble = ({ message, isMine, showAvatar, avatar }) => {
  
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
    <div className={`flex w-full mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!isMine && (
        <div className="flex-shrink-0 mr-2 w-7 h-7">
          {showAvatar ? (
            <div className="h-7 w-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-white overflow-hidden shadow-sm">
              {typeof avatar === 'string' && avatar.length === 1 ? avatar : <img src={avatar} alt="" className="h-full w-full object-cover" />}
            </div>
          ) : (
            <div className="h-7 w-7" /> // Placeholder to align messages without avatar
          )}
        </div>
      )}

      <div className="max-w-[70%] group flex items-end">
        <div
          className={`px-4 py-2 rounded-2xl relative ${
            isMine 
              ? 'bg-messenger text-white rounded-br-md' 
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center self-end mb-1 ml-1 min-w-[16px]">
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

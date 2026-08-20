import React from 'react';
import useChatStore from '../../store/chatStore';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Bell, Ban, AlertTriangle, Users, Circle } from 'lucide-react';

const RightSidebar = () => {
  const activeConversation = useChatStore(state => state.activeConversation);
  const activeConversationDetail = useChatStore(state => state.activeConversationDetail);
  const onlineUsers = useChatStore(state => state.onlineUsers);
  const { user } = useAuth();

  if (!activeConversation) return null;

  // Backend enum: private_chat | groups_chat
  const isGroup = activeConversationDetail?.type === 'groups_chat';
  const otherMember = !isGroup && activeConversationDetail
      ? activeConversationDetail.members.find(m => m.userId !== user?.id)
      : null;
  const isOnline = otherMember ? onlineUsers[otherMember.userId]?.status === 'online' : false;
  const statusText = isGroup ? `${activeConversationDetail?.members?.length || 0} thành viên` : (isOnline ? 'Active now' : 'Offline');

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto bg-white border-l border-gray-200">
      {/* Profile Header */}
      <div className="flex flex-col items-center pt-8 pb-4 px-4 border-b border-gray-100">
        <div className="relative">
          <div className={`h-20 w-20 rounded-full flex items-center justify-center text-3xl font-semibold text-white overflow-hidden shadow-sm ${isGroup ? 'bg-purple-500' : 'bg-blue-400'}`}>
            {activeConversation.avatar ? (
              <img src={activeConversation.avatar} alt={activeConversation.name} className="h-full w-full object-cover" />
            ) : isGroup ? (
              <Users size={32} />
            ) : (
              activeConversation.name.charAt(0).toUpperCase()
            )}
          </div>
          {!isGroup && isOnline && (
            <div className="absolute bottom-1 right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </div>
        <h2 className="mt-3 text-xl font-bold text-gray-900">{activeConversation.name}</h2>
        <p className="text-sm text-gray-500">{statusText}</p>

        <div className="flex space-x-4 mt-5">
          <button className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors">
            <div className="p-2.5 bg-gray-100 rounded-full hover:bg-blue-50">
              <Bell size={18} />
            </div>
            <span className="text-xs mt-1 font-medium">Tắt thông báo</span>
          </button>
          <button className="flex flex-col items-center text-gray-600 hover:text-blue-600 transition-colors">
            <div className="p-2.5 bg-gray-100 rounded-full hover:bg-blue-50">
              <Search size={18} />
            </div>
            <span className="text-xs mt-1 font-medium">Tìm kiếm</span>
          </button>
        </div>
      </div>

      {/* Group Members */}
      {isGroup && activeConversationDetail?.members && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users size={14} /> Thành viên ({activeConversationDetail.members.length})
          </h3>
          <div className="space-y-2">
            {activeConversationDetail.members.map(member => {
              const memberOnline = onlineUsers[member.userId]?.status === 'online';
              const isMe = member.userId === user?.id;
              return (
                <div key={member.userId} className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-semibold text-white">
                      {member.userName.charAt(0).toUpperCase()}
                    </div>
                    {memberOnline && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {member.userName} {isMe && <span className="text-gray-400 font-normal">(Bạn)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{member.role === 'ADMIN' ? 'Admin' : 'Thành viên'}</p>
                  </div>
                  <Circle
                    size={8}
                    className={memberOnline ? 'text-green-500 fill-green-500' : 'text-gray-300 fill-gray-300'}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accordion Menu */}
      <div className="px-2 py-2">
        {[
          { label: 'Thông tin cuộc trò chuyện' },
          { label: 'Tùy chỉnh đoạn chat' },
          { label: 'File và ảnh' },
        ].map(item => (
          <div key={item.label} className="py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer px-3 flex justify-between items-center transition-colors">
            <span className="text-sm font-semibold text-gray-700">{item.label}</span>
            <span className="text-gray-400 text-xs">›</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto px-2 py-4 border-t border-gray-100">
        <button className="w-full flex items-center px-3 py-2 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors">
          <Ban size={18} className="mr-3 text-gray-500" />
          <span className="text-sm font-medium">Chặn</span>
        </button>
        <button className="w-full flex items-center px-3 py-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors">
          <AlertTriangle size={18} className="mr-3" />
          <span className="text-sm font-medium">Báo cáo</span>
        </button>
      </div>
    </div>
  );
};

export default RightSidebar;

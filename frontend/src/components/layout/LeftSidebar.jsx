import React, { useState } from 'react';
import { Search, Edit, MoreHorizontal, Users } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import { useAuth } from '../../contexts/AuthContext';
import NewConversationModal from '../chat/NewConversationModal';

const LeftSidebar = () => {
  const conversations = useChatStore(state => state.conversations);
  const activeConversation = useChatStore(state => state.activeConversation);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const onlineUsers = useChatStore(state => state.onlineUsers);
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
        <div className="flex space-x-2">
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
            <MoreHorizontal size={20} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            title="Tạo cuộc trò chuyện mới"
            className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-700 transition-colors"
          >
            <Edit size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-full leading-5 bg-gray-100 text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-colors"
            placeholder="Tìm kiếm cuộc trò chuyện"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2">
        {filteredConversations.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p>Chưa có cuộc trò chuyện nào.</p>
            <button onClick={() => setShowModal(true)} className="mt-2 text-blue-500 hover:underline font-medium">
              Tạo cuộc trò chuyện mới
            </button>
          </div>
        )}
        {filteredConversations.map((conv) => {
          const isOnline = !conv.isGroup && conv.otherUserId && onlineUsers[conv.otherUserId]?.status === 'online';
          return (
            <div
              key={conv.id}
              onClick={() => setActiveConversation(conv)}
              className={`flex items-center px-2 py-3 mb-1 cursor-pointer rounded-lg transition-colors ${
                activeConversation?.id === conv.id ? 'bg-blue-50' : 'hover:bg-gray-100'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-semibold text-white overflow-hidden ${conv.isGroup ? 'bg-purple-500' : 'bg-blue-400'}`}>
                  {conv.avatar ? (
                    <img src={conv.avatar} alt={conv.name} className="h-full w-full object-cover" />
                  ) : conv.isGroup ? (
                    <Users size={24} />
                  ) : (
                    conv.name.charAt(0).toUpperCase()
                  )}
                </div>
                {isOnline && (
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>

              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h2 className={`text-base truncate ${conv.unread > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                    {conv.name}
                  </h2>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {conv.isGroup ? 'Nhóm' : isOnline ? 'Online' : ''}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className={`text-sm truncate ${conv.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                    {conv.lastMessage || 'Chưa có tin nhắn'}
                  </p>
                  {conv.unread > 0 && (
                    <span className="inline-flex items-center justify-center ml-2 h-5 min-w-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full flex-shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Profile / Logout */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            {user?.userName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="ml-2">
            <p className="font-semibold text-sm text-gray-900">{user?.userName}</p>
            <p className="text-xs text-green-500 font-medium">● Active</p>
          </div>
        </div>
        <button onClick={logout} className="text-xs text-red-500 hover:underline font-medium">Đăng xuất</button>
      </div>

      {showModal && <NewConversationModal onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default LeftSidebar;

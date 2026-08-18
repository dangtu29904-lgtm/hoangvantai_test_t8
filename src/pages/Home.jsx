import React, { useEffect, useState } from 'react';
import useChatSocket from '../hooks/useChatSocket';
import useChatStore from '../store/chatStore';
import LeftSidebar from '../components/layout/LeftSidebar';
import CenterChat from '../components/layout/CenterChat';
import RightSidebar from '../components/layout/RightSidebar';
import { chatApi } from '../services/api';

const Home = () => {
  useChatSocket();
  const activeConversation = useChatStore(state => state.activeConversation);
  const setConversations = useChatStore(state => state.setConversations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await chatApi.getConversations(null, 20);
        const formatted = (data.items || []).map(conv => ({
          id: conv.id,
          name: conv.name,
          avatar: conv.avatarUrl,
          isOnline: false,
          lastMessage: conv.lastMessage ? conv.lastMessage.content : '',
          unread: conv.unreadCount ?? 0,
          type: conv.type,
          isGroup: conv.type === 'groups_chat',
          updatedAt: conv.updatedAt,
        }));
        setConversations(formatted);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [setConversations]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
      <div className={`w-full md:w-[360px] flex-shrink-0 border-r border-gray-200 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <LeftSidebar />
      </div>

      <div className={`flex-1 flex flex-col min-w-0 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeConversation ? (
          <CenterChat />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h3 className="mt-2 text-xl font-medium text-gray-900">No chat selected</h3>
              <p className="mt-1 text-sm text-gray-500">Choose a conversation from the sidebar or start a new one.</p>
            </div>
          </div>
        )}
      </div>

      {activeConversation && (
        <div className="hidden lg:flex w-[320px] flex-shrink-0 border-l border-gray-200 bg-white">
          <RightSidebar />
        </div>
      )}
    </div>
  );
};

export default Home;

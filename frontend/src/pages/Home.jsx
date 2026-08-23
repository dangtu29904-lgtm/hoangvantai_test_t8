import { useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import useChatSocket from '../hooks/useChatSocket';
import useChatStore from '../store/chatStore';
import LeftSidebar from '../components/layout/LeftSidebar';
import CenterChat from '../components/layout/CenterChat';
import RightSidebar from '../components/layout/RightSidebar';
import { chatApi, notificationApi } from '../services/api';
import ProfilePanel from '../components/social/ProfilePanel';
import PeoplePanel from '../components/social/PeoplePanel';
import NotificationsPanel from '../components/social/NotificationsPanel';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Bell, MessageCircle, UsersRound, UserRound } from 'lucide-react';

const Home = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const chatActions = useChatSocket();
  const { isConnected, wsService } = useWebSocket();
  const activeConversation = useChatStore(state => state.activeConversation);
  const setConversations = useChatStore(state => state.setConversations);
  const [notificationRefresh, setNotificationRefresh] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const view = location.pathname === '/friends'
    ? 'people'
    : location.pathname === '/profile'
      ? 'profile'
      : location.pathname === '/notifications'
        ? 'notifications'
        : 'chat';

  useEffect(() => {
    if (location.pathname === '/') navigate('/chat', { replace: true });
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!isConnected) return undefined;
    const handleNotification = () => setNotificationRefresh((value) => value + 1);
    wsService.subscribe('/user/queue/notifications', handleNotification);
    return () => wsService.unsubscribe('/user/queue/notifications', handleNotification);
  }, [isConnected, wsService]);

  useEffect(() => {
    notificationApi.unreadCount().then((data) => setUnreadNotifications(data.unreadCount || 0)).catch(() => {});
  }, [notificationRefresh]);

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
      }
    };

    fetchConversations();
  }, [setConversations]);

  return (
    <div className="flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-[#f7f9fc]">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
        <button onClick={() => navigate('/chat')} className="flex items-center gap-2 text-left">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-lg font-black text-white">S</span>
          <span className="hidden text-lg font-black tracking-tight text-slate-900 sm:block">socially</span>
        </button>
        <nav className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
          {[['chat', MessageCircle, 'Tin nhắn'], ['people', UsersRound, 'Bạn bè'], ['profile', UserRound, 'Hồ sơ'], ['notifications', Bell, 'Thông báo']].map(([id, Icon, label]) => (
            <button key={id} onClick={() => navigate(id === 'chat' ? '/chat' : id === 'people' ? '/friends' : id === 'profile' ? '/profile' : '/notifications')} title={label} className={`relative flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${view === id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              <Icon size={17} /><span className="hidden md:block">{label}</span>
              {id === 'notifications' && unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
            </button>
          ))}
        </nav>
        <div className="w-9" />
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        {view === 'profile' && <ProfilePanel />}
        {view === 'people' && <PeoplePanel />}
        {view === 'notifications' && <NotificationsPanel refreshKey={notificationRefresh} onUnreadChange={setUnreadNotifications} />}
        {view === 'chat' && <div className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden bg-white md:grid-cols-[360px_minmax(0,1fr)] lg:grid-cols-[360px_minmax(0,1fr)_300px]">
          <div className={`min-h-0 min-w-0 border-r border-gray-200 ${activeConversation ? 'hidden md:flex' : 'flex'}`}><LeftSidebar /></div>
          <div className={`min-h-0 min-w-0 ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
            {activeConversation ? <CenterChat {...chatActions} /> : <div className="flex flex-1 items-center justify-center bg-gray-50"><div className="text-center"><h3 className="text-xl font-medium text-gray-900">Chưa chọn đoạn chat</h3><p className="mt-1 text-sm text-gray-500">Chọn một cuộc trò chuyện để bắt đầu.</p></div></div>}
          </div>
          {activeConversation && <div className="hidden min-h-0 min-w-0 border-l border-gray-200 bg-white lg:flex"><RightSidebar /></div>}
        </div>}
      </main>
    </div>
  );
};

export default Home;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Bookmark, ChevronDown, Clock3, Film, Home, MessageCircle, Menu, Users } from 'lucide-react';
import Header from '../components/layout/Header';
import PostCard from '../components/social/PostCard';
import { feedApi, notificationApi, profileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MessengerPanel from '../components/dashboard/MessengerPanel';
import NotificationPopup from '../components/dashboard/NotificationPopup';
import useChatSocket from '../hooks/useChatSocket';
import useChatStore from '../store/chatStore';

const Avatar = ({ name, src, size = 'h-10 w-10' }) => (
  <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white`}>
    {src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}
  </div>
);

const LeftRail = ({ user, navigate, onLogout }) => (
  <div className="space-y-5">
    <div className="space-y-1">
      <button
        onClick={() => navigate('/profile')}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#242526]"
      >
        <Avatar name={user?.userName} src={user?.avatarUrl} size="h-9 w-9" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{user?.userName || 'Tai khoan'}</p>
          <p className="truncate text-xs text-[#b0b3b8]">{user?.email || 'Ho so cua ban'}</p>
        </div>
      </button>

      {[
        ['Bang dieu khien', Home, '/home'],
        ['Ban be', Users, '/friends'],
        ['Tin nhan', MessageCircle, '/chat'],
        ['Thong bao', Bell, '/notifications'],
        ['Da luu', Bookmark, '/saved'],
        ['Ky niem', Clock3, null],
        ['Nhom', Users, null],
        ['Thuoc phim', Film, null],
      ].map(([label, Icon, path]) => (
        <button
          key={label}
          onClick={() => path && navigate(path)}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-[#242526] ${
            label === 'Da luu' ? 'bg-[#242526] text-white' : 'text-[#e4e6eb]'
          }`}
        >
          <Icon size={18} className="text-[#2d88ff]" />
          <span>{label}</span>
        </button>
      ))}

      <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-[#e4e6eb] transition hover:bg-[#242526]">
        <ChevronDown size={18} className="text-[#2d88ff]" />
        <span>Xem them</span>
      </button>
    </div>

    <button
      onClick={onLogout}
      className="flex w-full items-center justify-between rounded-2xl border border-[#2f3031] px-4 py-3 text-sm font-semibold text-[#b0b3b8] transition hover:bg-[#242526] hover:text-white"
    >
      <span>Dang xuat</span>
      <Menu size={16} />
    </button>
  </div>
);

const SavedPostsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chatActions = useChatSocket();
  const activeConversation = useChatStore((state) => state.activeConversation);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [feedInfo, setFeedInfo] = useState({ page: 0, totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const me = profile || user;

  const loadSavedPosts = async (page = 0) => {
    setLoading(true);
    try {
      const data = await feedApi.getSavedPosts(page, 20);
      setPosts(data.items || []);
      setFeedInfo({
        page: data.page || 0,
        totalPages: data.totalPages || 0,
        totalElements: data.totalElements || 0,
      });
    } catch (error) {
      console.error('Failed to load saved posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeConversation) setPopup('chat');
  }, [activeConversation]);

  useEffect(() => {
    loadSavedPosts();
    profileApi.getMe().then(setProfile).catch(() => {});
    notificationApi.list(0, 8).then((data) => setNotifications(data.items || [])).catch(() => {});
    notificationApi.unreadCount().then((data) => setUnreadNotifications(data.unreadCount || 0)).catch(() => {});
  }, []);

  const openNotifications = async () => {
    setPopup((current) => (current === 'notifications' ? null : 'notifications'));
    try {
      const data = await notificationApi.list(0, 8);
      setNotifications(data.items || []);
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#18191a] text-[#e4e6eb]">
      <Header
        currentUser={me}
        onToggleChat={() => setPopup((current) => (current === 'chat' ? null : 'chat'))}
        onToggleNotifications={openNotifications}
        unreadNotifications={unreadNotifications}
      />

      <main className="mx-auto flex max-w-[1600px] gap-6 px-4 py-5">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <div className="sticky top-20">
            <LeftRail user={me} navigate={navigate} onLogout={logout} />
          </div>
        </aside>

        <section className="min-w-0 flex-1 max-w-[860px]">
          <div className="mb-4 rounded-2xl border border-[#2f3031] bg-[#242526] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b0b3b8]">Đã lưu</p>
            <h1 className="mt-1 text-2xl font-black text-white">Saved Posts</h1>
            <p className="mt-2 text-sm text-[#b0b3b8]">
              Những bài viết bạn đã lưu sẽ xuất hiện ở đây, sẵn sàng để xem lại bất cứ lúc nào.
            </p>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-[#3e4042] bg-[#242526] p-10 text-center text-sm text-[#b0b3b8]">
                Đang tải bài viết đã lưu...
              </div>
            ) : posts.length > 0 ? (
              posts.map((item) => (
                <PostCard
                  key={item.post?.id}
                  post={item.post}
                  currentUser={me}
                  savedAt={item.savedAt}
                  onReload={() => loadSavedPosts(feedInfo.page || 0)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#3e4042] bg-[#242526] p-10 text-center text-sm text-[#b0b3b8]">
                Bạn chưa lưu bài viết nào.
              </div>
            )}
          </div>

          {feedInfo.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-4 text-sm">
              <button
                disabled={(feedInfo.page || 0) <= 0}
                onClick={() => loadSavedPosts((feedInfo.page || 0) - 1)}
                className="rounded-xl bg-[#3a3b3c] px-4 py-2 font-semibold text-white disabled:opacity-40"
              >
                Trước
              </button>
              <span className="text-[#b0b3b8]">
                {(feedInfo.page || 0) + 1} / {feedInfo.totalPages}
              </span>
              <button
                disabled={(feedInfo.page || 0) >= (feedInfo.totalPages || 1) - 1}
                onClick={() => loadSavedPosts((feedInfo.page || 0) + 1)}
                className="rounded-xl bg-[#3a3b3c] px-4 py-2 font-semibold text-white disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
        </section>

        <aside className="hidden w-[320px] shrink-0 xl:block">
          <div className="sticky top-20 space-y-4 rounded-2xl border border-[#2f3031] bg-[#242526] p-4">
            <p className="text-sm font-semibold text-white">Tổng quan</p>
            <div className="space-y-2 text-sm text-[#b0b3b8]">
              <div className="flex items-center justify-between">
                <span>Số bài đã lưu</span>
                <span className="font-semibold text-white">{feedInfo.totalElements || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Trạng thái</span>
                <span className="font-semibold text-white">Sẵn sàng</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Thông báo</span>
                <span className="font-semibold text-white">{notifications.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {popup === 'chat' && (
        <MessengerPanel
          chatActions={chatActions}
          onClose={() => setPopup(null)}
          onOpenMessenger={() => navigate('/chat')}
          onNewConversation={() => navigate('/chat')}
        />
      )}

      {popup === 'notifications' && <NotificationPopup onClose={() => setPopup(null)} />}
    </div>
  );
};

export default SavedPostsPage;

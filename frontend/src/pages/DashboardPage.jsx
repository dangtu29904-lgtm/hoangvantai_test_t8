import React, { useEffect, useState } from 'react';
import { Bell, Bookmark, Compass, Edit3, Film, Gamepad2, Heart, Home, Image, Menu, MessageCircle, MoreHorizontal, Search, Send, Settings, ThumbsUp, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { feedApi, notificationApi, profileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MessengerPanel from '../components/dashboard/MessengerPanel';
import NotificationPopup from '../components/dashboard/NotificationPopup';
import useChatSocket from '../hooks/useChatSocket';
import useChatStore from '../store/chatStore';
import PostCard from '../components/social/PostCard';

import Header from '../components/layout/Header';

const reactionIcon = { LIKE: 'Like', LOVE: 'Love', HAHA: 'Haha', WOW: 'Wow', SAD: 'Sad', ANGRY: 'Angry' };

const Avatar = ({ name, src, size = 'h-10 w-10' }) => <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white`}>{src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}</div>;

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chatActions = useChatSocket();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [feedInfo, setFeedInfo] = useState({ page: 0, totalPages: 0 });
  const [showComposer, setShowComposer] = useState(false);
  const [popup, setPopup] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const loadFeed = async (page = 0) => {
    try { const data = await feedApi.getFeed(page); setPosts(data.items || []); setFeedInfo(data); } catch (error) { console.error('Failed to load feed:', error); }
  };

  const activeConversation = useChatStore(state => state.activeConversation);

  useEffect(() => {
    if (activeConversation) {
      setPopup('chat');
    }
  }, [activeConversation]);

  useEffect(() => {
    loadFeed();
    profileApi.getMe().then(setProfile).catch(() => {});
    notificationApi.list(0, 8).then(data => setNotifications(data.items || [])).catch(() => {});
    notificationApi.unreadCount().then(data => setUnreadNotifications(data.unreadCount || 0)).catch(() => {});
  }, []);

  const openNotifications = async () => {
    setPopup(popup === 'notifications' ? null : 'notifications');
    try { const data = await notificationApi.list(0, 8); setNotifications(data.items || []); } catch (_) {}
  };

  return <div className="h-screen w-full overflow-y-auto bg-[#18191a] text-[#e4e6eb]">
    <Header 
      currentUser={profile || user} 
      onToggleChat={() => setPopup(popup === 'chat' ? null : 'chat')} 
      onToggleNotifications={openNotifications} 
      unreadNotifications={unreadNotifications} 
    />
    <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-5 px-3 py-5 lg:grid-cols-[240px_minmax(0,680px)_280px] xl:gap-8">
      <aside className="hidden lg:block"><DashboardSidebar user={profile || user} onLogout={logout} navigate={navigate} /></aside>
      <section className="min-w-0"><div className="mb-4 flex items-center justify-between rounded-xl bg-[#242526] p-3 shadow-sm"><div className="flex min-w-0 items-center gap-3"><Avatar name={profile?.userName || user?.userName} src={profile?.avatarUrl} /><button onClick={() => setShowComposer(true)} className="flex-1 rounded-full bg-[#3a3b3c] px-4 py-2.5 text-left text-sm text-[#b0b3b8] hover:bg-[#4e4f50]">{profile?.userName || user?.userName} ơi, bạn đang nghĩ gì thế?</button></div><button onClick={() => setShowComposer(true)} className="ml-2 rounded-lg p-2 text-[#f3425f] hover:bg-[#3a3b3c]"><Edit3 size={20} /></button></div><div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-[#242526] p-3"><QuickAction icon={<Film className="text-[#f3425f]" />} label="Video trực tiếp" /><QuickAction icon={<Image className="text-[#45bd62]" />} label="Ảnh/video" onClick={() => setShowComposer(true)} /><QuickAction icon={<Heart className="text-[#f7b928]" />} label="Cảm xúc" /></div>{(posts || []).map(post => post && <PostCard key={post.id} post={post} currentUser={user} onReload={() => loadFeed(feedInfo.page || 0)} />)}{(!posts || posts.length === 0) && <div className="rounded-xl bg-[#242526] p-10 text-center text-sm text-[#b0b3b8]">Chưa có bài viết nào trong bảng tin.</div>}<Pager page={feedInfo.page} totalPages={feedInfo.totalPages} onChange={loadFeed} /></section>
      <aside className="hidden lg:block"><RightRail user={profile || user} /></aside>
    </main>
    {popup === 'chat' && <MessengerPanel chatActions={chatActions} onClose={() => setPopup(null)} onOpenMessenger={() => navigate('/chat')} />}
    {popup === 'notifications' && <NotificationPopup onClose={() => setPopup(null)} />}
    {showComposer && <PostComposer profile={profile || user} onClose={() => setShowComposer(false)} onCreated={() => { setShowComposer(false); loadFeed(); }} />}
  </div>;
};

const TopNav = ({ icon, label, active, onClick }) => <button onClick={onClick} title={label} className={`flex h-11 min-w-16 items-center justify-center rounded-lg px-5 ${active ? 'border-b-2 border-[#2d88ff] text-[#2d88ff]' : 'text-[#b0b3b8] hover:bg-[#3a3b3c]'}`}>{icon}<span className="sr-only">{label}</span></button>;
const IconButton = ({ icon, label, onClick, badge }) => <button onClick={onClick} title={label} className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50]">{icon}{badge && <span className="absolute -right-0.5 -top-1 h-2.5 w-2.5 rounded-full bg-[#fa3e3e]" />}</button>;
const QuickAction = ({ icon, label, onClick }) => <button onClick={onClick} className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c]">{icon}<span className="hidden sm:block">{label}</span></button>;
const DashboardSidebar = ({ user, navigate, onLogout }) => <div className="space-y-1 text-sm font-semibold"><button onClick={() => navigate('/profile')} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-[#3a3b3c]"><Avatar name={user?.userName} src={user?.avatarUrl} size="h-9 w-9" />{user?.userName}</button>{[['Bạn bè', Users, '/friends'], ['Tin nhắn', MessageCircle, '/chat'], ['Thông báo', Bell, '/notifications'], ['Đã lưu', Bookmark], ['Cài đặt', Settings]].map(([label, Icon, path]) => <button key={label} onClick={() => path && navigate(path)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left text-[#e4e6eb] hover:bg-[#3a3b3c]"><Icon size={20} className="text-[#2d88ff]" />{label}</button>)}<button onClick={onLogout} className="mt-5 w-full border-t border-[#3e4042] p-3 text-left text-sm text-[#b0b3b8] hover:text-white">Đăng xuất</button></div>;
const RightRail = ({ user }) => <div><h3 className="mb-3 text-sm font-bold text-[#b0b3b8]">Được tài trợ</h3><div className="rounded-xl bg-[#242526] p-3"><div className="flex h-28 items-center justify-center rounded-lg bg-gradient-to-br from-[#203a43] to-[#2c5364] text-center text-sm font-bold">Không gian để bạn khám phá sản phẩm mới</div><p className="mt-2 text-sm font-semibold">Khám phá điều mới</p><p className="text-xs text-[#b0b3b8]">Nội dung quảng bá sẽ xuất hiện tại đây.</p></div><h3 className="mb-3 mt-7 text-sm font-bold text-[#b0b3b8]">Danh bạ</h3><div className="space-y-2"><Contact name={user?.userName || 'Bạn'} /><Contact name="Bạn bè đang hoạt động" /><Contact name="Cộng đồng của bạn" /></div></div>;
const Contact = ({ name }) => <div className="flex items-center gap-3 rounded-lg p-2 text-sm font-semibold hover:bg-[#3a3b3c]"><span className="h-2.5 w-2.5 rounded-full bg-[#31a24c]" />{name}</div>;

const PostComposer = ({ profile, onClose, onCreated }) => { const [content, setContent] = useState(''); const [privacy, setPrivacy] = useState('PUBLIC'); const [loading, setLoading] = useState(false); const submit = async () => { if (!content.trim()) return; setLoading(true); try { await feedApi.createPost({ content: content.trim(), privacy }); onCreated(); } finally { setLoading(false); } }; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg overflow-hidden rounded-xl bg-[#242526] shadow-2xl"><div className="flex items-center justify-between border-b border-[#3e4042] px-5 py-4"><h2 className="text-xl font-bold">Tạo bài viết</h2><button onClick={onClose} className="rounded-full bg-[#3a3b3c] p-2 text-[#b0b3b8]"><X size={18} /></button></div><div className="p-5"><div className="mb-4 flex items-center gap-3"><Avatar name={profile?.userName} src={profile?.avatarUrl} /><div><p className="font-bold">{profile?.userName}</p><select value={privacy} onChange={e => setPrivacy(e.target.value)} className="rounded-lg bg-[#3a3b3c] px-2 py-1 text-xs outline-none"><option value="PUBLIC">Công khai</option><option value="FRIENDS">Bạn bè</option><option value="ONLY_ME">Chỉ mình tôi</option></select></div></div><textarea autoFocus rows="5" value={content} onChange={e => setContent(e.target.value)} placeholder="Bạn đang nghĩ gì?" className="w-full resize-none bg-transparent text-xl outline-none placeholder:text-[#b0b3b8]" /><div className="mt-4 flex items-center justify-between rounded-lg border border-[#3e4042] p-3"><span className="text-sm font-semibold">Thêm vào bài viết</span><div className="flex gap-4 text-[#45bd62]"><Image size={20} /><Film size={20} /><Heart size={20} /></div></div><button disabled={loading || !content.trim()} onClick={submit} className="mt-4 w-full rounded-lg bg-[#1877f2] py-2.5 font-bold disabled:opacity-40">{loading ? 'Đang đăng...' : 'Đăng'}</button></div></div></div>; };


const Pager = ({ page = 0, totalPages = 0, onChange }) => totalPages > 1 && <div className="mb-5 flex items-center justify-center gap-4 text-sm"><button disabled={page <= 0} onClick={() => onChange(page - 1)} className="rounded-lg bg-[#3a3b3c] px-4 py-2 disabled:opacity-40">Trước</button><span className="text-[#b0b3b8]">{page + 1} / {totalPages}</span><button disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)} className="rounded-lg bg-[#3a3b3c] px-4 py-2 disabled:opacity-40">Sau</button></div>;

export default DashboardPage;

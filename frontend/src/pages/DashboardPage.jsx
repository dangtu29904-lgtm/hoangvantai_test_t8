import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  ChevronDown,
  Compass,
  Edit3,
  Film,
  Heart,
  Home,
  Image,
  MessageCircle,
  Menu,
  Plus,
  PlayCircle,
  Clock3,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { feedApi, notificationApi, profileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MessengerPanel from '../components/dashboard/MessengerPanel';
import NotificationPopup from '../components/dashboard/NotificationPopup';
import useChatSocket from '../hooks/useChatSocket';
import useChatStore from '../store/chatStore';
import PostCard from '../components/social/PostCard';
import NewConversationModal from '../components/chat/NewConversationModal';
import Header from '../components/layout/Header';
import StoryBar from '../components/social/story/StoryBar';
import MentionTextarea from '../components/social/mention/MentionTextarea';
import { mentionIds } from '../components/social/mention/mentionUtils';

const Avatar = ({ name, src, size = 'h-10 w-10' }) => (
  <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white`}>
    {src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}
  </div>
);

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const chatActions = useChatSocket();
  const activeConversation = useChatStore((state) => state.activeConversation);

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [feedInfo, setFeedInfo] = useState({ page: 0, totalPages: 0 });
  const [showComposer, setShowComposer] = useState(false);
  const [popup, setPopup] = useState(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const me = profile || user;

  const loadFeed = async (page = 0) => {
    try {
      const data = await feedApi.getFeed(page);
      setPosts(data.items || []);
      setFeedInfo(data);
    } catch (error) {
      console.error('Failed to load feed:', error);
    }
  };

  useEffect(() => {
    if (activeConversation) setPopup('chat');
  }, [activeConversation]);

  useEffect(() => {
    loadFeed();
    profileApi.getMe().then(setProfile).catch(() => {});
    notificationApi.list(0, 8).then((data) => setNotifications(data.items || [])).catch(() => {});
    notificationApi.unreadCount().then((data) => setUnreadNotifications(data.unreadCount || 0)).catch(() => {});
  }, []);

  const openNotifications = async () => {
    setPopup((current) => (current === 'notifications' ? null : 'notifications'));
    try {
      const data = await notificationApi.list(0, 8);
      setNotifications(data.items || []);
    } catch (_) {}
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#18191a] text-[#e4e6eb]">
      <Header
        currentUser={me}
        onToggleChat={() => setPopup((current) => (current === 'chat' ? null : 'chat'))}
        onToggleNotifications={openNotifications}
        unreadNotifications={unreadNotifications}
      />

      <main className="mx-auto flex max-w-[1600px] gap-6 px-4 py-5">
        <aside className="hidden w-[280px] shrink-0 lg:block">
          <div className="sticky top-20 space-y-5">
            <LeftRail user={me} navigate={navigate} onLogout={logout} />
          </div>
        </aside>

        <section className="min-w-0 flex-1 max-w-[700px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#2f3031] bg-[#242526] px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar name={me?.userName} src={me?.avatarUrl} size="h-10 w-10" />
                <button
                  onClick={() => setShowComposer(true)}
                  className="min-w-0 flex-1 rounded-full bg-[#3a3b3c] px-4 py-2.5 text-left text-sm text-[#b0b3b8] transition hover:bg-[#4e4f50]"
                >
                  {me?.userName || 'Ban'}, ban dang nghi gi the?
                </button>
                <button
                  onClick={() => setShowComposer(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3a3b3c] text-[#f3425f] transition hover:bg-[#4e4f50]"
                  title="Dang bai"
                >
                  <Edit3 size={18} />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <QuickChip icon={<Film size={16} className="text-[#f3425f]" />} label="Video truc tiep" />
                <QuickChip icon={<Image size={16} className="text-[#45bd62]" />} label="Anh / video" onClick={() => setShowComposer(true)} />
                <QuickChip icon={<Heart size={16} className="text-[#f7b928]" />} label="Cam xuc" />
              </div>
            </div>

            <StoryBar currentUser={me} />

            <div className="space-y-4">
              {(posts || []).map((post) => post && (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={me}
                  onReload={() => loadFeed(feedInfo.page || 0)}
                  onShared={() => loadFeed(0)}
                />
              ))}
            </div>

            {(!posts || posts.length === 0) && (
              <div className="rounded-2xl border border-dashed border-[#3e4042] bg-[#242526] p-10 text-center text-sm text-[#b0b3b8]">
                Chua co bai viet nao trong bang tin.
              </div>
            )}

            <Pager page={feedInfo.page} totalPages={feedInfo.totalPages} onChange={loadFeed} />
          </div>
        </section>

        <aside className="hidden w-[320px] shrink-0 xl:block">
          <div className="sticky top-20 space-y-4">
            <RightRail user={me} notifications={notifications} />
          </div>
        </aside>
      </main>

      {popup === 'chat' && (
        <MessengerPanel
          chatActions={chatActions}
          onClose={() => setPopup(null)}
          onOpenMessenger={() => navigate('/chat')}
          onNewConversation={() => setShowConversationModal(true)}
        />
      )}

      {popup === 'notifications' && <NotificationPopup onClose={() => setPopup(null)} />}

      {showComposer && (
        <PostComposer
          profile={me}
          onClose={() => setShowComposer(false)}
          onCreated={() => {
            setShowComposer(false);
            loadFeed();
          }}
        />
      )}

      {showConversationModal && <NewConversationModal onClose={() => setShowConversationModal(false)} />}
    </div>
  );
};

const QuickChip = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-[#b0b3b8] transition hover:bg-[#3a3b3c] hover:text-white"
  >
    {icon}
    <span>{label}</span>
  </button>
);

const _CreateStoryCard = ({ avatar }) => (
  <button className="relative h-[260px] w-[160px] shrink-0 overflow-hidden rounded-2xl border border-[#2f3031] bg-[#18191a] text-left shadow-sm transition hover:-translate-y-0.5">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,136,255,0.28),_transparent_50%),linear-gradient(180deg,_#2a2d34,_#111318)]" />
    <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.52))]" />

    <div className="absolute left-3 top-3 rounded-full ring-4 ring-[#18191a]">
      <Avatar name="You" src={avatar} size="h-10 w-10" />
    </div>

    <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#18191a] bg-[#2d88ff] text-white shadow-lg">
      <Plus size={28} />
    </div>

    <div className="absolute inset-x-0 bottom-0 p-3">
      <div className="rounded-2xl bg-[#18191a]/90 p-3 backdrop-blur-sm">
        <p className="text-sm font-bold text-white">Tạo tin</p>
        <p className="mt-1 text-xs leading-4 text-[#b0b3b8]">Chia sẻ ảnh, video hoặc trạng thái mới.</p>
      </div>
    </div>
  </button>
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
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-[#e4e6eb] transition hover:bg-[#242526]"
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

    <div className="border-t border-[#2f3031]" />

    <div>
      <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.2em] text-[#b0b3b8]">Loi tat cua ban</p>
      <div className="space-y-1">
        <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-[#e4e6eb] transition hover:bg-[#242526]">
          <Avatar name="G" size="h-9 w-9" />
          <span>Giao Luu Cau Long Ha Noi</span>
        </button>
      </div>
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

const RightRail = ({ user, notifications }) => (
  <div className="space-y-4">
    <RailSection title="Duoc tai tro">
      <SponsoredCard
        title="No coding skills required"
        subtitle="Build your store fast with AI"
        meta="shopify.com"
        tone="from-[#0d1117] to-[#1f2937]"
      />
      <SponsoredCard
        title="Save 40% on Creative Cloud Pro."
        subtitle="Save 40% on 20+ creative apps"
        meta="adobe.com"
        tone="from-[#111827] to-[#27272a]"
      />
    </RailSection>

    <RailSection title="Sinh nhat">
      <div className="flex items-start gap-3 rounded-2xl bg-[#242526] p-4">
        <div className="mt-0.5 text-[#45bd62]">
          <Bell size={18} />
        </div>
        <p className="text-sm text-[#e4e6eb]">
          Hom nay la sinh nhat cua <span className="font-semibold">{user?.userName || 'ban'}</span>.
        </p>
      </div>
    </RailSection>

    <RailSection title="Trang thai">
      <div className="space-y-2 rounded-2xl bg-[#242526] p-4">
        <RailStatus label="Tin nhan" value={`${notifications.length} thong bao`} />
        <RailStatus label="Ket noi" value="Realtime" />
        <RailStatus label="Chat" value="San sang" />
      </div>
    </RailSection>
  </div>
);

const RailSection = ({ title, children }) => (
  <div>
    <h3 className="mb-3 text-lg font-bold text-[#b0b3b8]">{title}</h3>
    {children}
  </div>
);

const RailStatus = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-2xl px-1 py-1.5">
    <span className="text-sm text-[#b0b3b8]">{label}</span>
    <span className="text-sm font-semibold text-white">{value}</span>
  </div>
);

const SponsoredCard = ({ title, subtitle, meta, tone }) => (
  <div className="overflow-hidden rounded-2xl border border-[#2f3031] bg-[#242526]">
    <div className={`h-40 bg-gradient-to-br ${tone} p-4 text-white`}>
      <div className="h-full w-full rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Sponsored</p>
        <p className="mt-6 max-w-[180px] text-lg font-black leading-tight">{title}</p>
      </div>
    </div>
    <div className="space-y-1 p-4">
      <p className="text-sm font-semibold text-white">{subtitle}</p>
      <p className="text-xs text-[#b0b3b8]">{meta}</p>
    </div>
  </div>
);

const PostComposer = ({ profile, onClose, onCreated }) => {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState([]);
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const fileInputRef = React.useRef(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    return () => {
      mediaItems.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [mediaItems]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onPickFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 10 - mediaItems.length;
    const nextFiles = files.slice(0, remainingSlots).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
      type: file.type.startsWith('video/') ? 'video' : 'image',
    }));

    setMediaItems((current) => [...current, ...nextFiles]);
    event.target.value = '';
  };

  const removeMedia = (index) => {
    setMediaItems((current) => {
      const next = [...current];
      const [removed] = next.splice(index, 1);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  };

  const submit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setSubmitError('');
    try {
      const uploadResults = await Promise.all(
        mediaItems.map(async (item) => {
          const upload = await feedApi.uploadFile(item.file);
          if (!upload?.uploadId) {
            throw new Error(`Không lấy được uploadId cho file ${item.name}`);
          }
          return upload.uploadId;
        })
      );
      await feedApi.createPost({
        content: content.trim(),
        privacy,
        mediaIds: uploadResults,
        mentionedUserIds: mentionIds(mentions),
      });
      onCreated();
      setContent('');
      setMentions([]);
      setMediaItems([]);
    } catch (error) {
      console.error('Create post error:', error);
      setSubmitError(error?.response?.data?.message || error?.message || 'Không thể đăng bài viết');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-visible rounded-3xl border border-[#3e4042] bg-[#242526] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3e4042] px-5 py-4">
          <h2 className="text-xl font-bold text-white">Tạo bài viết</h2>
          <button onClick={onClose} className="rounded-full bg-[#3a3b3c] p-2 text-[#b0b3b8]">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={profile?.userName} src={profile?.avatarUrl} />
            <div>
              <p className="font-bold text-white">{profile?.userName}</p>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="mt-1 rounded-lg bg-[#3a3b3c] px-2 py-1 text-xs text-white outline-none"
              >
                <option value="PUBLIC">Công khai</option>
                <option value="FRIENDS">Bạn bè</option>
                <option value="ONLY_ME">Chỉ mình tôi</option>
              </select>
            </div>
          </div>
          <MentionTextarea
            autoFocus
            rows="5"
            value={content}
            onChange={setContent}
            selectedMentions={mentions}
            onMentionsChange={setMentions}
            currentUserId={profile?.id}
            placeholder="Bạn đang nghĩ gì?"
            className="w-full resize-none bg-transparent text-xl text-white outline-none placeholder:text-[#b0b3b8]"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />

          <div className="mt-4 rounded-2xl border border-[#3e4042] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Thêm vào bài viết</span>
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center gap-2 rounded-full bg-[#3a3b3c] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4e4f50]"
              >
                <Image size={16} className="text-[#45bd62]" />
                Chọn ảnh / video
              </button>
            </div>

            {mediaItems.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {mediaItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="relative overflow-hidden rounded-2xl border border-[#3e4042] bg-[#18191a]">
                    {item.type === 'video' ? (
                      <video src={item.previewUrl} className="h-28 w-full object-cover" />
                    ) : (
                      <img src={item.previewUrl} alt={item.name} className="h-28 w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                      title="Xóa file"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-[11px] text-white">
                      {item.type === 'video' ? 'Video' : 'Anh'} · {item.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-2 text-xs text-[#b0b3b8]">
              Tối đa 10 media. Hỗ trợ ảnh và video. File sẽ được upload cùng lúc khi bạn đăng bài.
            </p>
          </div>
          <button
            disabled={loading || !content.trim()}
            onClick={submit}
            className="mt-4 w-full rounded-2xl bg-[#1877f2] py-2.5 font-bold text-white disabled:opacity-40"
          >
            {loading ? 'Đang đăng...' : 'Đăng'}
          </button>
          {submitError && <p className="mt-2 text-sm text-rose-400">{submitError}</p>}
        </div>
      </div>
    </div>
  );
};

const Pager = ({ page = 0, totalPages = 0, onChange }) => totalPages > 1 && (
  <div className="mb-5 flex items-center justify-center gap-4 text-sm">
    <button
      disabled={page <= 0}
      onClick={() => onChange(page - 1)}
      className="rounded-xl bg-[#3a3b3c] px-4 py-2 font-semibold text-white disabled:opacity-40"
    >
      Truoc
    </button>
    <span className="text-[#b0b3b8]">{page + 1} / {totalPages}</span>
    <button
      disabled={page >= totalPages - 1}
      onClick={() => onChange(page + 1)}
      className="rounded-xl bg-[#3a3b3c] px-4 py-2 font-semibold text-white disabled:opacity-40"
    >
      Sau
    </button>
  </div>
);

export default DashboardPage;

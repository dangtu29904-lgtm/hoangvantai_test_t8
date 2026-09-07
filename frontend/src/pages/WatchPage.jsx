import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  ChevronDown,
  MessageCircle,
  MoreHorizontal,
  Search,
  Share2,
  Star,
  ThumbsUp,
  UserCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import MessengerPanel from '../components/dashboard/MessengerPanel';
import NotificationPopup from '../components/dashboard/NotificationPopup';
import NewConversationModal from '../components/chat/NewConversationModal';
import useChatSocket from '../hooks/useChatSocket';
import { useAuth } from '../contexts/AuthContext';
import { feedApi, profileApi } from '../services/api';

const REELS_PAGE_SIZE = 8;

const formatCount = (value) => {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(number);
};

const firstVideo = (post) => (post?.media || []).find((item) => item?.type === 'VIDEO' && item?.url);

const Avatar = ({ name, src, size = 'h-10 w-10' }) => (
  <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#3a3b3c] font-black text-white ring-1 ring-white/10`}>
    {src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" /> : (name || 'S').charAt(0).toUpperCase()}
  </div>
);

const WatchRailButton = ({ icon: Icon, label, active }) => (
  <button
    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[15px] font-bold transition ${
      active ? 'bg-[#242526] text-white' : 'text-[#e4e6eb] hover:bg-[#242526]'
    }`}
  >
    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${active ? 'bg-white text-black' : 'bg-[#242526] text-[#e4e6eb]'}`}>
      <Icon size={18} />
    </span>
    <span>{label}</span>
  </button>
);

const ActionButton = ({ icon: Icon, label, active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group flex flex-col items-center gap-1 text-xs font-bold ${active ? 'text-[#2d88ff]' : 'text-white'}`}
  >
    <span className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition group-hover:scale-105 ${
      active ? 'bg-[#2d88ff]/20' : 'bg-black/35 backdrop-blur hover:bg-white/15'
    }`}>
      {children || <Icon size={22} />}
    </span>
    <span className="drop-shadow">{label}</span>
  </button>
);

const ReelCard = ({ post, muted, onToggleMuted, onLike, onComment, onShare }) => {
  const video = firstVideo(post);
  const videoRef = useRef(null);
  const myReaction = post?.engagement?.myReaction;
  const totalReactions = post?.engagement?.totalReactions ?? 0;
  const commentCount = post?.engagement?.commentCount ?? 0;
  const shareCount = post?.shareCount ?? 0;

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          element.play().catch(() => {});
        } else {
          element.pause();
        }
      },
      { threshold: [0, 0.65, 1] }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!video) return null;

  return (
    <section className="relative flex h-[calc(100vh-56px)] snap-start items-center justify-center px-4 py-4">
      <div className="relative h-full w-full max-w-[820px] overflow-hidden rounded-lg bg-black shadow-2xl ring-1 ring-white/10">
        <video
          ref={videoRef}
          src={video.url}
          className="h-full w-full bg-black object-contain"
          muted={muted}
          loop
          playsInline
          controls={false}
        />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2),transparent_24%,transparent_58%,rgba(0,0,0,0.72))]" />

        <button
          type="button"
          onClick={onToggleMuted}
          className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
          title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
        </button>

        <button
          type="button"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/70"
          title="Tìm kiếm trong Watch"
        >
          <Search size={22} />
        </button>

        <div className="absolute bottom-5 left-5 right-24 text-white">
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={post.authorName} src={post.authorAvatarUrl} size="h-9 w-9" />
            <div className="min-w-0">
              <button type="button" className="block truncate text-sm font-black hover:underline">
                {post.authorName || 'Nguoi dung Socially'}
              </button>
              <p className="truncate text-xs font-semibold text-white/80">Dang theo doi · Am thanh goc</p>
            </div>
          </div>
          {post.content && (
            <p className="line-clamp-2 max-w-xl text-sm font-semibold leading-5 text-white drop-shadow">
              {post.content}
            </p>
          )}
        </div>

        <div className="absolute bottom-5 right-4 flex flex-col items-center gap-4">
          <ActionButton
            icon={ThumbsUp}
            label={formatCount(totalReactions)}
            active={Boolean(myReaction)}
            onClick={() => onLike(post)}
          />
          <ActionButton icon={MessageCircle} label={formatCount(commentCount)} onClick={() => onComment(post)} />
          <ActionButton icon={Share2} label={formatCount(shareCount)} onClick={() => onShare(post)} />
          <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur hover:bg-white/15">
            <MoreHorizontal size={22} />
          </button>
          <Avatar name={post.authorName} src={post.authorAvatarUrl} size="h-10 w-10" />
        </div>
      </div>
    </section>
  );
};

const WatchPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const chatActions = useChatSocket();
  const scrollerRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const [popup, setPopup] = useState(null);
  const [showConversationModal, setShowConversationModal] = useState(false);

  const me = profile || user;
  const hasMore = Number(pageInfo.page || 0) < Number(pageInfo.totalPages || 0) - 1;

  const loadVideos = useCallback(async (nextPage = 0, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');

    try {
      const data = await feedApi.getVideoFeed(nextPage, REELS_PAGE_SIZE);
      const items = (data.items || []).filter(firstVideo);
      setPosts((current) => append ? [...current, ...items] : items);
      setPageInfo(data);
    } catch (err) {
      console.error('Load watch feed error:', err);
      setError(err?.response?.data?.message || 'Khong tai duoc danh sach video');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadVideos(0);
    profileApi.getMe().then(setProfile).catch(() => {});
  }, [loadVideos]);

  const handleScroll = useCallback((event) => {
    const node = event.currentTarget;
    const remaining = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (remaining < node.clientHeight * 1.5 && hasMore && !loadingMore && !loading) {
      loadVideos(Number(pageInfo.page || 0) + 1, true);
    }
  }, [hasMore, loadVideos, loading, loadingMore, pageInfo.page]);

  const reactToPost = async (post) => {
    try {
      const currentReaction = post?.engagement?.myReaction;
      if (currentReaction) {
        await feedApi.removeReaction(post.id);
      } else {
        await feedApi.react(post.id, 'LIKE');
      }

      const reactions = await feedApi.getReactions(post.id, 0, 1);
      setPosts((current) => current.map((item) => (
        item.id === post.id
          ? {
              ...item,
              engagement: {
                ...(item.engagement || {}),
                totalReactions: reactions.totalReactions ?? 0,
                reactionCounts: reactions.reactionCounts ?? {},
                myReaction: reactions.myReaction ?? null,
              },
            }
          : item
      )));
    } catch (err) {
      console.error('Watch reaction error:', err);
    }
  };

  const sharePost = async (post) => {
    try {
      await feedApi.sharePost(post.id, {
        content: '',
        privacy: post.privacy === 'FRIENDS' ? 'FRIENDS' : 'PUBLIC',
        mentionedUserIds: [],
      });
      setPosts((current) => current.map((item) => (
        item.id === post.id ? { ...item, shareCount: Number(item.shareCount || 0) + 1 } : item
      )));
    } catch (err) {
      console.error('Watch share error:', err);
      window.alert(err?.response?.data?.message || 'Khong the chia se video');
    }
  };

  const scrollByCard = (direction) => {
    scrollerRef.current?.scrollBy({
      top: direction * (window.innerHeight - 56),
      behavior: 'smooth',
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-black text-[#e4e6eb]">
      <Header
        currentUser={me}
        onToggleChat={() => setPopup((current) => (current === 'chat' ? null : 'chat'))}
        onToggleNotifications={() => setPopup((current) => (current === 'notifications' ? null : 'notifications'))}
      />

      <div className="flex h-[calc(100vh-56px)]">
        <aside className="hidden w-[260px] shrink-0 border-r border-[#242526] bg-black px-2 py-4 lg:block">
          <div className="sticky top-0">
            <h1 className="mb-2 px-2 text-2xl font-black text-white">Reels</h1>
            <div className="space-y-1">
              <WatchRailButton icon={Star} label="Danh cho ban" active />
              <WatchRailButton icon={Bookmark} label="Dang theo doi" />
              <WatchRailButton icon={UserCircle} label="Trang ca nhan" />
            </div>
          </div>
        </aside>

        <main
          ref={scrollerRef}
          onScroll={handleScroll}
          className="relative min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto bg-black"
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-[#b0b3b8]">
              Dang tai Watch...
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm font-semibold text-rose-300">{error}</p>
              <button
                type="button"
                onClick={() => loadVideos(0)}
                className="rounded-full bg-[#1877f2] px-4 py-2 text-sm font-black text-white"
              >
                Thu lai
              </button>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[#b0b3b8]">
              <p className="text-lg font-black text-white">Chua co video nao</p>
              <p className="max-w-sm text-sm">Dang bai viet co video cong khai hoac video tu ban be de hien thi tai day.</p>
            </div>
          )}

          {!loading && !error && posts.map((post) => (
            <ReelCard
              key={post.id}
              post={post}
              muted={muted}
              onToggleMuted={() => setMuted((current) => !current)}
              onLike={reactToPost}
              onComment={(item) => navigate(`/posts/${item.id}`)}
              onShare={sharePost}
            />
          ))}

          {loadingMore && (
            <div className="flex h-20 items-center justify-center text-xs font-bold text-[#b0b3b8]">
              Dang tai them video...
            </div>
          )}
        </main>

        <div className="pointer-events-none fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 xl:flex">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#242526] text-white shadow-lg hover:bg-[#3a3b3c]"
            title="Video truoc"
          >
            <ChevronDown size={24} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#242526] text-white shadow-lg hover:bg-[#3a3b3c]"
            title="Video tiep"
          >
            <ChevronDown size={24} />
          </button>
        </div>
      </div>

      {popup === 'chat' && (
        <MessengerPanel
          chatActions={chatActions}
          onClose={() => setPopup(null)}
          onOpenMessenger={() => navigate('/chat')}
          onNewConversation={() => setShowConversationModal(true)}
        />
      )}

      {popup === 'notifications' && <NotificationPopup onClose={() => setPopup(null)} />}
      {showConversationModal && <NewConversationModal onClose={() => setShowConversationModal(false)} />}
    </div>
  );
};

export default WatchPage;

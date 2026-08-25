import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  EyeOff,
  FileText,
  Flag,
  Globe,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Share2,
  ThumbsUp,
  Trash2,
  Users,
  X,
  Edit3,
} from 'lucide-react';
import { feedApi, reportApi } from '../../services/api';
import CommentSection from './comments/CommentSection';
import MentionTextarea from './mention/MentionTextarea';
import MentionedContent from './mention/MentionedContent';
import { mentionIds, uniqueMentions } from './mention/mentionUtils';

const Avatar = ({ name, src, size = 'h-10 w-10' }) => (
  <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white`}>
    {src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}
  </div>
);

const REACTION_TYPES = [
  { id: 'LIKE', label: 'Thích', icon: '👍', color: 'text-[#2d88ff]' },
  { id: 'LOVE', label: 'Yêu thích', icon: '❤️', color: 'text-[#f3425f]' },
  { id: 'HAHA', label: 'Cười', icon: '😆', color: 'text-[#f7b928]' },
  { id: 'WOW', label: 'Bất ngờ', icon: '😮', color: 'text-[#f7b928]' },
  { id: 'SAD', label: 'Buồn', icon: '😢', color: 'text-[#f7b928]' },
  { id: 'ANGRY', label: 'Phẫn nộ', icon: '😡', color: 'text-[#e41e3f]' },
];

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Quấy rối' },
  { value: 'HATE_SPEECH', label: 'Ngôn từ thù ghét' },
  { value: 'VIOLENCE', label: 'Bạo lực' },
  { value: 'SEXUAL_CONTENT', label: 'Nội dung tình dục' },
  { value: 'SCAM', label: 'Lừa đảo' },
  { value: 'FALSE_INFORMATION', label: 'Thông tin sai lệch' },
  { value: 'OTHER', label: 'Lý do khác' },
];

const PRIVACY_OPTIONS = [
  { value: 'PUBLIC', label: 'Công khai', icon: Globe },
  { value: 'FRIENDS', label: 'Bạn bè', icon: Users },
  { value: 'ONLY_ME', label: 'Chỉ mình tôi', icon: Lock },
];

const formatDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

const PrivacyIcon = ({ privacy }) => {
  switch (privacy) {
    case 'FRIENDS':
      return <Users size={14} className="text-[#b0b3b8]" title="Bạn bè" />;
    case 'ONLY_ME':
      return <Lock size={14} className="text-[#b0b3b8]" title="Chỉ mình tôi" />;
    default:
      return <Globe size={14} className="text-[#b0b3b8]" title="Công khai" />;
  }
};

const MenuAction = ({ icon: Icon, title, subtitle, danger, onClick }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#3a3b3c] ${
      danger ? 'text-[#fa3e3e]' : 'text-[#e4e6eb]'
    }`}
  >
    <span className={`mt-0.5 rounded-full p-2 ${danger ? 'bg-[#fa3e3e]/10' : 'bg-[#3a3b3c]'}`}>
      <Icon size={16} />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold">{title}</span>
      {subtitle && <span className="mt-0.5 block text-xs font-normal text-[#b0b3b8]">{subtitle}</span>}
    </span>
  </button>
);

const MediaGrid = ({ media = [] }) => {
  if (!Array.isArray(media) || media.length === 0) return null;

  if (media.length === 1) {
    const item = media[0];
    return (
      <div className="overflow-hidden rounded-2xl border border-[#3e4042] bg-[#18191a]">
        {item?.type === 'VIDEO' ? (
          <video controls className="max-h-[560px] w-full bg-black" src={item?.url} />
        ) : item?.type === 'FILE' ? (
          <a
            href={item?.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-4 text-sm text-white hover:bg-[#3a3b3c]"
          >
            <FileText size={18} className="text-[#2d88ff]" />
            <span className="truncate">{item?.originalFileName || 'Tệp đính kèm'}</span>
          </a>
        ) : (
          <img src={item?.url} alt={item?.originalFileName || 'Post media'} className="max-h-[560px] w-full object-cover" />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 overflow-hidden rounded-2xl">
      {media.map((item, index) => {
        const isVideo = item?.type === 'VIDEO';
        const isFile = item?.type === 'FILE';
        return (
          <div key={item?.id || `${item?.url || index}`} className="overflow-hidden rounded-2xl border border-[#3e4042] bg-[#18191a]">
            {isVideo ? (
              <video controls className="h-56 w-full bg-black object-cover" src={item?.url} />
            ) : isFile ? (
              <a
                href={item?.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-56 items-center justify-center gap-3 p-4 text-sm text-white hover:bg-[#3a3b3c]"
              >
                <FileText size={18} className="text-[#2d88ff]" />
                <span className="truncate">{item?.originalFileName || 'Tệp đính kèm'}</span>
              </a>
            ) : (
              <img src={item?.url} alt={item?.originalFileName || 'Post media'} className="h-56 w-full object-cover" />
            )}
          </div>
        );
      })}
    </div>
  );
};

const OriginalPostPreview = ({ originalPost }) => {
  if (!originalPost || originalPost.available === false) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[#3e4042] bg-[#1c1d1e]">
      <div className="border-b border-[#3e4042] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b0b3b8]">
        Bài gốc
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar name={originalPost.authorName} src={originalPost.authorAvatarUrl} size="h-8 w-8" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{originalPost.authorName}</p>
            <p className="text-xs text-[#b0b3b8]">{formatDateTime(originalPost.createdAt)}</p>
          </div>
        </div>
        <MentionedContent
          content={originalPost.content}
          mentions={originalPost.mentions}
          className="text-sm leading-relaxed text-[#e4e6eb]"
        />
        <MediaGrid media={originalPost.media || []} />
      </div>
    </div>
  );
};

const ReactionBadge = ({ type, count }) => {
  const meta = {
    LIKE: { icon: '👍', color: 'bg-[#2d88ff]' },
    LOVE: { icon: '❤️', color: 'bg-[#f3425f]' },
    HAHA: { icon: '😆', color: 'bg-[#f7b928]' },
    WOW: { icon: '😮', color: 'bg-[#f7b928]' },
    SAD: { icon: '😢', color: 'bg-[#f7b928]' },
    ANGRY: { icon: '😡', color: 'bg-[#e41e3f]' },
  }[type];

  if (!meta || !count) return null;

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[#3a3b3c] px-2 py-1 text-xs font-semibold text-white">
      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${meta.color}`}>{meta.icon}</span>
      <span>{count}</span>
    </div>
  );
};

const ReactionListModal = ({ postId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [myReaction, setMyReaction] = useState(null);
  const [totalReactions, setTotalReactions] = useState(0);
  const [reactionCounts, setReactionCounts] = useState({});

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await feedApi.getReactions(postId, page, 20);
        if (!active) return;
        setItems(data.items || []);
        setTotalPages(data.totalPages || 0);
        setMyReaction(data.myReaction || null);
        setTotalReactions(data.totalReactions || 0);
        setReactionCounts(data.reactionCounts || {});
      } catch (error) {
        console.error('Load reactions error:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [postId, page]);

  const reactionLabel = (type) => {
    switch (type) {
      case 'LIKE':
        return 'Thích';
      case 'LOVE':
        return 'Yêu thích';
      case 'HAHA':
        return 'Cười';
      case 'WOW':
        return 'Bất ngờ';
      case 'SAD':
        return 'Buồn';
      case 'ANGRY':
        return 'Phẫn nộ';
      default:
        return 'Đã bày tỏ';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#3e4042] bg-[#242526] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3e4042] px-5 py-4">
          <button onClick={onClose} className="rounded-full p-2 text-[#b0b3b8] hover:bg-[#3a3b3c]">
            <X size={18} />
          </button>
          <h2 className="text-lg font-bold text-white">Lượt bày tỏ cảm xúc</h2>
          <div className="w-9" />
        </div>

        <div className="border-b border-[#3e4042] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-[#b0b3b8]">Tổng:</span>
            <span className="font-semibold text-white">{totalReactions}</span>
            {reactionCounts && Object.entries(reactionCounts).map(([type, count]) => (
              <ReactionBadge key={type} type={type} count={count} />
            ))}
          </div>
          {myReaction && <p className="mt-2 text-xs text-[#b0b3b8]">Bạn đã bày tỏ: {reactionLabel(myReaction)}</p>}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="p-6 text-center text-sm text-[#b0b3b8]">Đang tải...</div>
          ) : items.length > 0 ? (
            items.map((item) => (
              <div key={`${item.userId}-${item.reactedAt}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-[#3a3b3c]">
                <Avatar name={item.userName} src={item.userAvatarUrl} size="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{item.userName}</p>
                  <p className="text-xs text-[#b0b3b8]">{reactionLabel(item.type)}</p>
                </div>
                <span className="text-[11px] text-[#8a8d91]">{item.reactedAt ? new Date(item.reactedAt).toLocaleString('vi-VN') : ''}</span>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-sm text-[#b0b3b8]">Chưa có ai bày tỏ cảm xúc.</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#3e4042] px-5 py-3">
            <button
              disabled={page <= 0}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl bg-[#3a3b3c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-sm text-[#b0b3b8]">{page + 1} / {totalPages}</span>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl bg-[#3a3b3c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ShareModal = ({ post, currentUser, onClose, onShared }) => {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState([]);
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const shareTarget = post?.originalPost?.available ? post.originalPost : post;

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await feedApi.sharePost(post.id, {
        content: content.trim(),
        privacy,
        mentionedUserIds: mentionIds(mentions),
      });
      await onShared?.();
      onClose();
    } catch (err) {
      console.error('Share error:', err);
      setError(err?.response?.data?.message || 'Khong the chia se bai viet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl overflow-visible rounded-3xl border border-[#3e4042] bg-[#242526] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3e4042] px-5 py-4">
          <button onClick={onClose} className="rounded-full p-2 text-[#b0b3b8] hover:bg-[#3a3b3c]">
            <X size={18} />
          </button>
          <h2 className="text-lg font-bold text-white">Chia sẻ</h2>
          <div className="w-9" />
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-start gap-3">
            <Avatar name={currentUser?.userName} src={currentUser?.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white">{currentUser?.userName || 'Bạn'}</p>
              <button
                onClick={() => setPrivacy((current) => (current === 'PUBLIC' ? 'FRIENDS' : current === 'FRIENDS' ? 'ONLY_ME' : 'PUBLIC'))}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#3a3b3c] px-3 py-1.5 text-xs font-semibold text-[#e4e6eb]"
              >
                {PRIVACY_OPTIONS.find((item) => item.value === privacy)?.label || 'Công khai'}
              </button>
            </div>
          </div>

          <MentionTextarea
            value={content}
            onChange={setContent}
            selectedMentions={mentions}
            onMentionsChange={setMentions}
            currentUserId={currentUser?.id}
            placeholder="Bạn muốn nói gì về bài viết này?"
            rows={4}
            className="w-full resize-none rounded-2xl border border-[#3e4042] bg-[#18191a] p-4 text-[15px] text-white outline-none placeholder:text-[#b0b3b8]"
          />

          <div className="mt-4 rounded-2xl border border-[#3e4042] bg-[#18191a] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Xem trước bài gốc</p>
              <span className="text-xs text-[#b0b3b8]">{shareTarget?.privacy || 'PUBLIC'}</span>
            </div>
            <div className="rounded-2xl border border-[#3e4042] bg-[#242526] p-4">
              <div className="mb-3 flex items-center gap-3">
                <Avatar name={shareTarget?.authorName} src={shareTarget?.authorAvatarUrl} size="h-9 w-9" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{shareTarget?.authorName}</p>
                  <p className="text-xs text-[#b0b3b8]">{formatDateTime(shareTarget?.createdAt)}</p>
                </div>
              </div>
              <MentionedContent
                content={shareTarget?.content}
                mentions={shareTarget?.mentions}
                className="text-sm leading-relaxed text-[#e4e6eb]"
              />
              <MediaGrid media={shareTarget?.media || []} />
            </div>
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1877f2] py-3 font-bold text-white disabled:opacity-50"
          >
            <Share2 size={18} />
            {loading ? 'Đang chia sẻ...' : 'Chia sẻ ngay'}
          </button>
          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        </div>
      </div>
    </div>
  );
};

const ReportModal = ({ post, onClose, onSubmitted }) => {
  const [reason, setReason] = useState('SPAM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await reportApi.reportPost(post.id, {
        reason,
        description: description.trim(),
      });
      onSubmitted?.();
      onClose();
      window.alert('Cảm ơn bạn. Báo cáo đã được gửi.');
    } catch (error) {
      console.error('Report error:', error);
      window.alert('Không thể gửi báo cáo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#3e4042] bg-[#242526] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3e4042] px-5 py-4">
          <button onClick={onClose} className="rounded-full p-2 text-[#b0b3b8] hover:bg-[#3a3b3c]">
            <X size={18} />
          </button>
          <h2 className="text-lg font-bold text-white">Báo cáo bài viết</h2>
          <div className="w-9" />
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Tại sao bạn báo cáo bài viết này?</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-2xl border border-[#3e4042] bg-[#18191a] px-4 py-3 text-sm text-white outline-none"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white">Mô tả thêm</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Không bắt buộc"
              className="w-full resize-none rounded-2xl border border-[#3e4042] bg-[#18191a] px-4 py-3 text-sm text-white outline-none placeholder:text-[#b0b3b8]"
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fa3e3e] py-3 font-bold text-white disabled:opacity-50"
          >
            <Flag size={18} />
            {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PostCard = ({ post, currentUser, onReload, onShared, savedAt }) => {
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(
    post?.engagement?.commentCount ?? post?.commentCount ?? 0
  );
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post?.content || '');
  const [editMentions, setEditMentions] = useState(() => uniqueMentions(post?.mentions || []));
  const [editPrivacy, setEditPrivacy] = useState(post?.privacy || 'PUBLIC');
  const [savingEdit, setSavingEdit] = useState(false);
  const [isSaved, setIsSaved] = useState(Boolean(post?.saved));
  const [savingState, setSavingState] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [hidingPost, setHidingPost] = useState(false);
  const [showReactionList, setShowReactionList] = useState(false);
  const [reactionSummary, setReactionSummary] = useState({
    totalReactions: post?.engagement?.totalReactions ?? post?.totalReactions ?? 0,
    myReaction: post?.userReaction || post?.engagement?.myReaction || null,
    reactionCounts: post?.engagement?.reactionCounts || {},
  });

  const isAuthor = currentUser?.id && post?.authorId && currentUser.id === post.authorId;
  const totalReactions = reactionSummary.totalReactions;
  const commentCount = localCommentCount;
  const shareCount = post?.shareCount ?? 0;
  const myReaction = reactionSummary.myReaction;
  const currentReactObj = useMemo(() => REACTION_TYPES.find((r) => r.id === reactionSummary.myReaction), [reactionSummary.myReaction]);
  const isSharedPost = Boolean(post?.originalPost?.available);

  useEffect(() => {
    setEditContent(post?.content || '');
    setEditMentions(uniqueMentions(post?.mentions || []));
    setEditPrivacy(post?.privacy || 'PUBLIC');
    setIsSaved(Boolean(post?.saved));
    setReactionSummary({
      totalReactions: post?.engagement?.totalReactions ?? post?.totalReactions ?? 0,
      myReaction: post?.userReaction || post?.engagement?.myReaction || null,
      reactionCounts: post?.engagement?.reactionCounts || {},
    });
    setLocalCommentCount(post?.engagement?.commentCount ?? post?.commentCount ?? 0);
  }, [post?.id, post?.userReaction, post?.engagement?.myReaction, post?.content, post?.mentions, post?.privacy, post?.saved, post?.engagement?.commentCount, post?.commentCount]);

  useEffect(() => {
    let active = true;

    const hydrateReactions = async () => {
      try {
        const data = await feedApi.getReactions(post.id, 0, 1);
        if (!active) return;
        setReactionSummary({
          totalReactions: data.totalReactions || 0,
          myReaction: data.myReaction || null,
          reactionCounts: data.reactionCounts || {},
        });
      } catch (error) {
        console.error('Hydrate reactions error:', error);
      }
    };

    hydrateReactions();
    return () => {
      active = false;
    };
  }, [post.id]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleReact = async (type) => {
    setShowReactionPicker(false);
    try {
      if (myReaction === type) {
        await feedApi.removeReaction(post.id);
      } else {
        await feedApi.react(post.id, type);
      }
      const refreshed = await feedApi.getReactions(post.id, 0, 1);
      setReactionSummary({
        totalReactions: refreshed.totalReactions || 0,
        myReaction: refreshed.myReaction || null,
        reactionCounts: refreshed.reactionCounts || {},
      });
      onReload?.();
    } catch (error) {
      console.error('React error:', error);
    }
  };

  const handleToggleComments = async () => {
    setCommentsOpen((current) => !current);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      await feedApi.updatePost(post.id, {
        content: editContent.trim(),
        privacy: editPrivacy,
        mentionedUserIds: mentionIds(editMentions),
      });
      setIsEditing(false);
      setShowMenu(false);
      onReload?.();
    } catch (error) {
      window.alert('Không thể cập nhật bài viết');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?');
    if (!confirmed) return;
    try {
      await feedApi.deletePost(post.id);
      onReload?.();
    } catch (error) {
      window.alert('Không thể xóa bài viết');
    }
  };

  const handleSaveToggle = async () => {
    setSavingState(true);
    try {
      if (isSaved) {
        await feedApi.unsavePost(post.id);
        setIsSaved(false);
      } else {
        await feedApi.savePost(post.id);
        setIsSaved(true);
      }
      onReload?.();
    } catch (error) {
      console.error('Save toggle error:', error);
      window.alert('Không thể cập nhật trạng thái lưu bài viết');
    } finally {
      setSavingState(false);
    }
  };

  const handleHidePost = async () => {
    setHidingPost(true);
    try {
      await feedApi.hidePost(post.id);
      onReload?.();
    } catch (error) {
      console.error('Hide post error:', error);
      window.alert('Không thể ẩn bài viết');
    } finally {
      setHidingPost(false);
      setShowMenu(false);
    }
  };

  const menuActions = isAuthor
    ? [
        {
          icon: Bookmark,
          title: isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết',
          subtitle: 'Thêm vào mục đã lưu của bạn',
          onClick: handleSaveToggle,
        },
        {
          icon: Edit3,
          title: 'Chỉnh sửa bài viết',
          subtitle: 'Sửa nội dung hoặc quyền riêng tư',
          onClick: () => {
            setShowMenu(false);
            setIsEditing(true);
          },
        },
        {
          icon: Trash2,
          title: 'Xóa bài viết',
          subtitle: 'Xóa vĩnh viễn khỏi trang cá nhân',
          danger: true,
          onClick: handleDeletePost,
        },
      ]
    : [
        {
          icon: Bookmark,
          title: isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết',
          subtitle: 'Thêm vào mục đã lưu của bạn',
          onClick: handleSaveToggle,
        },
        {
          icon: EyeOff,
          title: 'Ẩn bài viết',
          subtitle: 'Xem ít nội dung như thế này hơn',
          onClick: handleHidePost,
        },
        {
          icon: Flag,
          title: 'Báo cáo bài viết',
          subtitle: 'Chúng tôi sẽ xem xét bài này',
          onClick: () => {
            setShowMenu(false);
            setShowReportModal(true);
          },
        },
      ];

  return (
    <article className="mb-4 overflow-visible rounded-xl border border-[#3e4042]/50 bg-[#242526] font-sans text-[#e4e6eb] shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="cursor-pointer" onClick={() => post?.authorId && navigate(`/profile/${post.authorId}`)}>
            <Avatar name={post?.authorName} src={post?.authorAvatarUrl} />
          </div>
          <div className="min-w-0">
            <h4
              className="cursor-pointer font-bold text-white hover:underline"
              onClick={() => post?.authorId && navigate(`/profile/${post.authorId}`)}
            >
              {post?.authorName || 'Người dùng Socially'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-[#b0b3b8]">
              <span>{formatDateTime(post?.createdAt) || 'Vừa xong'}</span>
              <span>•</span>
              <PrivacyIcon privacy={post?.privacy} />
            </div>
            {savedAt && <p className="mt-1 text-[11px] text-[#8a8d91]">Đã lưu: {formatDateTime(savedAt)}</p>}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((current) => !current)}
            className="rounded-full p-2 text-[#b0b3b8] transition hover:bg-[#3a3b3c]"
            title="Tùy chọn"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-[340px] overflow-y-auto rounded-2xl border border-[#3e4042] bg-[#242526] p-2 shadow-2xl">
              {menuActions.map((action) => (
                <MenuAction
                  key={action.title}
                  icon={action.icon}
                  title={action.title}
                  subtitle={action.subtitle}
                  danger={action.danger}
                  onClick={async () => {
                    setShowMenu(false);
                    await action.onClick?.();
                  }}
                />
              ))}

              {!isAuthor && (
                <>
                  <div className="my-1 h-px bg-[#3e4042]" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      navigate(`/profile/${post.authorId}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#e4e6eb] transition hover:bg-[#3a3b3c]"
                  >
                    <span className="rounded-full bg-[#3a3b3c] p-2">
                      <Users size={16} />
                    </span>
                    <span>Xem trang cá nhân</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="px-4 pb-4">
          <MentionTextarea
            rows={4}
            value={editContent}
            onChange={setEditContent}
            selectedMentions={editMentions}
            onMentionsChange={setEditMentions}
            currentUserId={currentUser?.id}
            className="w-full rounded-2xl border border-[#3e4042] bg-[#18191a] p-4 text-sm text-white outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <select
              value={editPrivacy}
              onChange={(e) => setEditPrivacy(e.target.value)}
              className="rounded-xl border border-[#3e4042] bg-[#18191a] px-3 py-2 text-sm text-white outline-none"
            >
              <option value="PUBLIC">Công khai</option>
              <option value="FRIENDS">Bạn bè</option>
              <option value="ONLY_ME">Chỉ mình tôi</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-xl bg-[#3a3b3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4e4f50]"
              >
                Hủy
              </button>
              <button
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="rounded-xl bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166fe5] disabled:opacity-50"
              >
                {savingEdit ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 px-4 pb-4">
          <MentionedContent
            content={post?.content}
            mentions={post?.mentions}
            className="text-[15px] leading-relaxed text-[#e4e6eb]"
          />
          <MediaGrid media={post?.media || []} />
          <OriginalPostPreview originalPost={post?.originalPost} />
        </div>
      )}

      {(totalReactions > 0 || commentCount > 0 || shareCount > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#3e4042] px-4 py-3 text-sm text-[#b0b3b8]">
          <button
            onClick={() => setShowReactionList(true)}
            className="flex items-center gap-2 hover:text-white"
          >
            <div className="flex -space-x-1">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-[11px] text-white">👍</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f3425f] text-[11px] text-white">❤️</span>
            </div>
            <span>{totalReactions}</span>
            {reactionSummary.reactionCounts && (
              <div className="hidden items-center gap-1 sm:flex">
                {Object.entries(reactionSummary.reactionCounts)
                  .filter(([, count]) => count > 0)
                  .slice(0, 3)
                  .map(([type, count]) => (
                    <ReactionBadge key={type} type={type} count={count} />
                  ))}
              </div>
            )}
          </button>
          <div className="flex items-center gap-3 text-xs sm:text-sm">
            {commentCount > 0 && <span>{commentCount} bình luận</span>}
            {shareCount > 0 && <span>{shareCount} chia sẻ</span>}
          </div>
        </div>
      )}

      <div className="relative flex items-center justify-between border-t border-[#3e4042] px-2 py-1">
        {showReactionPicker && (
          <div
            onMouseLeave={() => setShowReactionPicker(false)}
            className="absolute -top-12 left-4 z-40 flex items-center gap-1.5 rounded-full border border-[#3e4042] bg-[#242526] px-3 py-1.5 shadow-2xl"
          >
            {REACTION_TYPES.map((reaction) => (
              <button
                key={reaction.id}
                onClick={() => handleReact(reaction.id)}
                className="text-2xl transition hover:scale-125"
                title={reaction.label}
              >
                {reaction.icon}
              </button>
            ))}
          </div>
        )}

        <button
          onMouseEnter={() => setShowReactionPicker(true)}
          onClick={() => handleReact('LIKE')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors hover:bg-[#3a3b3c] ${
            currentReactObj ? currentReactObj.color : 'text-[#b0b3b8]'
          }`}
        >
          {currentReactObj ? <span className="text-base">{currentReactObj.icon}</span> : <ThumbsUp size={18} />}
          <span>{currentReactObj ? currentReactObj.label : 'Thích'}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] transition-colors hover:bg-[#3a3b3c]"
        >
          <MessageSquare size={18} />
          <span>Bình luận</span>
        </button>

        <button
          onClick={() => setShowShareModal(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] transition-colors hover:bg-[#3a3b3c]"
        >
          <Share2 size={18} />
          <span>Chia sẻ</span>
        </button>
      </div>

      {commentsOpen && (
        <CommentSection
          postId={post.id}
          currentUser={currentUser}
          initialCount={commentCount}
          onCountChange={(delta) => setLocalCommentCount((current) => Math.max(0, current + delta))}
          onCountSet={(count) => setLocalCommentCount(Number(count) || 0)}
          onMutated={onReload}
        />
      )}

      {showShareModal && (
        <ShareModal
          post={post}
          currentUser={currentUser}
          onClose={() => setShowShareModal(false)}
          onShared={onShared || onReload}
        />
      )}

      {showReportModal && <ReportModal post={post} onClose={() => setShowReportModal(false)} onSubmitted={onReload} />}
      {showReactionList && <ReactionListModal postId={post.id} onClose={() => setShowReactionList(false)} />}

      {savingState && <div className="sr-only">Đang cập nhật trạng thái bài viết</div>}
      {hidingPost && <div className="sr-only">Đang ẩn bài viết</div>}
      {isSharedPost && <div className="sr-only">Bài viết được chia sẻ từ bài gốc</div>}
    </article>
  );
};

export default PostCard;



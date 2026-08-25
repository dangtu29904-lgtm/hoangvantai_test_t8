import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Image as ImageIcon,
  Loader2,
  Lock,
  MoreHorizontal,
  Music,
  Plus,
  Send,
  Trash2,
  Type,
  Users,
  X,
} from 'lucide-react';
import { chatApi, storyApi } from '../../../services/api';
import { useWebSocket } from '../../../contexts/WebSocketContext';
import MusicPickerModal from './music/MusicPickerModal';

const REACTIONS = [
  { type: 'LIKE', icon: '👍', label: 'Thích' },
  { type: 'LOVE', icon: '❤️', label: 'Yêu thích' },
  { type: 'HAHA', icon: '😆', label: 'Cười' },
  { type: 'WOW', icon: '😮', label: 'Bất ngờ' },
  { type: 'SAD', icon: '😢', label: 'Buồn' },
  { type: 'ANGRY', icon: '😡', label: 'Phẫn nộ' },
];

const PRIVACY = [
  { value: 'PUBLIC', label: 'Công khai', icon: Users },
  { value: 'FRIENDS', label: 'Bạn bè', icon: Users },
  { value: 'ONLY_ME', label: 'Chỉ mình tôi', icon: Lock },
];

const TEXT_BACKGROUNDS = ['#1877F2', '#2b2d42', '#0f766e', '#be123c', '#7c3aed', '#111827'];
const TEXT_COLORS = ['#FFFFFF', '#FDE68A', '#BAE6FD', '#FBCFE8', '#DCFCE7', '#E5E7EB'];

const getReactionMeta = (type) => REACTIONS.find((reaction) => reaction.type === type);
const safeColor = (value, fallback) => (/^#[0-9a-fA-F]{3,8}$/.test(value || '') ? value : fallback);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isExpired = (story) => story?.expiresAt && new Date(story.expiresAt).getTime() <= Date.now();
const getMediaUrl = (story) => story?.media?.url || null;

const formatRelativeTime = (value) => {
  if (!value) return 'Vừa xong';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
};

const Avatar = ({ name, src, size = 'h-10 w-10', ring = false, seen = false }) => (
  <div
    className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white ${
      ring ? (seen ? 'ring-2 ring-[#65676b]' : 'ring-[3px] ring-[#1877f2]') : ''
    }`}
  >
    {src ? <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" /> : (name || 'U').charAt(0).toUpperCase()}
  </div>
);

const MusicThumb = ({ track, size = 'h-10 w-10' }) => (
  <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#3a3b3c] text-[#b0b3b8]`}>
    {track?.coverUrl ? <img src={track.coverUrl} alt="" className="h-full w-full object-cover" /> : <Music size={18} />}
  </div>
);

const StoryMusicBadge = ({ music }) => {
  if (!music) return null;

  return (
    <div className="pointer-events-none absolute left-4 right-4 top-20 z-10 flex items-center gap-2 rounded-full bg-black/35 px-3 py-2 text-white backdrop-blur">
      <MusicThumb track={music} size="h-8 w-8" />
      <div className="min-w-0">
        <p className="truncate text-xs font-black">{music.title}</p>
        <p className="truncate text-[11px] text-white/75">{music.artist || 'Không rõ nghệ sĩ'}</p>
      </div>
    </div>
  );
};

const getPreviewBackground = (story) => {
  const mediaUrl = getMediaUrl(story);
  if (mediaUrl) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.68)), url(${mediaUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: safeColor(story?.backgroundColor, '#1877F2') };
};

const compactFeed = (feed) =>
  (feed || [])
    .map((group) => ({
      ...group,
      stories: (group.stories || []).filter((story) => !isExpired(story)),
    }))
    .filter((group) => group.stories.length > 0);

const findStartStoryIndex = (group) => {
  const unseenIndex = (group?.stories || []).findIndex((story) => !story.seen);
  return unseenIndex >= 0 ? unseenIndex : 0;
};

const renderOverlays = (story) =>
  (story?.textOverlays || []).map((overlay) => (
    <div
      key={overlay.id || `${overlay.text}-${overlay.x}-${overlay.y}`}
      className="pointer-events-none absolute max-w-[86%] whitespace-pre-wrap break-words text-center font-bold drop-shadow-lg"
      style={{
        left: `${clamp(overlay.x ?? 0.5, 0, 1) * 100}%`,
        top: `${clamp(overlay.y ?? 0.5, 0, 1) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg)`,
        color: safeColor(overlay.color, '#ffffff'),
        fontSize: `${clamp(overlay.fontSize || 24, 14, 48)}px`,
        fontStyle: overlay.fontStyle === 'ITALIC' ? 'italic' : 'normal',
      }}
    >
      {overlay.text}
    </div>
  ));

const StoryCard = ({ group, onClick }) => {
  const firstStory = group.stories?.[findStartStoryIndex(group)] || group.stories?.[0];
  const isSeen = !group.hasUnseenStory;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-[210px] w-[132px] shrink-0 overflow-hidden rounded-xl border border-[#2f3031] bg-[#242526] text-left shadow-sm transition hover:brightness-110"
      style={getPreviewBackground(firstStory)}
    >
      {firstStory?.type === 'TEXT' && (
        <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-sm font-black leading-5" style={{ color: safeColor(firstStory.textColor, '#ffffff') }}>
          {firstStory.text}
        </div>
      )}
      <div className="absolute left-3 top-3">
        <Avatar name={group.authorName} src={group.avatarUrl} size="h-10 w-10" ring seen={isSeen} />
      </div>
      {firstStory?.music && (
        <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white">
          <Music size={16} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="line-clamp-2 text-sm font-bold leading-4 text-white drop-shadow">{group.authorName || 'Người dùng'}</p>
      </div>
      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
    </button>
  );
};

const CreateStoryCard = ({ currentUser, onClick, ownGroup }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative h-[210px] w-[132px] shrink-0 overflow-hidden rounded-xl border border-[#2f3031] bg-[#242526] text-left shadow-sm transition hover:brightness-110"
  >
    <div className="absolute inset-0 bg-[#18191a]">
      {ownGroup?.stories?.[0] ? (
        <div className="h-full w-full bg-cover bg-center" style={getPreviewBackground(ownGroup.stories[0])} />
      ) : currentUser?.avatarUrl ? (
        <img src={currentUser.avatarUrl} alt="" className="h-[70%] w-full object-cover" />
      ) : (
        <div className="h-[70%] bg-[#2f3031]" />
      )}
    </div>
    <div className="absolute inset-x-0 bottom-0 h-[72px] bg-[#242526]" />
    <div className="absolute left-1/2 top-[126px] flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-4 border-[#242526] bg-[#1877f2] text-white">
      <Plus size={23} />
    </div>
    <div className="absolute inset-x-0 bottom-4 text-center text-sm font-bold text-white">
      {ownGroup ? 'Tin của bạn' : 'Tạo tin'}
    </div>
  </button>
);

const StoryComposer = ({ currentUser, onClose, onCreated }) => {
  const [type, setType] = useState('TEXT');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [text, setText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#1877F2');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fileItem, setFileItem] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [overlayDraft, setOverlayDraft] = useState('');
  const [musicPickerOpen, setMusicPickerOpen] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => () => {
    if (fileItem?.previewUrl) URL.revokeObjectURL(fileItem.previewUrl);
  }, [fileItem]);

  const pickFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if ((type === 'IMAGE' && !isImage) || (type === 'VIDEO' && !isVideo)) {
      setError(type === 'IMAGE' ? 'Bạn cần chọn file ảnh.' : 'Bạn cần chọn file video.');
      event.target.value = '';
      return;
    }
    if (fileItem?.previewUrl) URL.revokeObjectURL(fileItem.previewUrl);
    setFileItem({ file, previewUrl: URL.createObjectURL(file), type: isVideo ? 'VIDEO' : 'IMAGE' });
    setError('');
    event.target.value = '';
  };

  const selectType = (nextType) => {
    setType(nextType);
    setError('');
    if (fileItem?.previewUrl) URL.revokeObjectURL(fileItem.previewUrl);
    setFileItem(null);
  };

  const addOverlay = () => {
    const value = overlayDraft.trim();
    if (!value || value.length > 300 || overlays.length >= 10) return;
    setOverlays((current) => [
      ...current,
      { text: value, x: 0.5, y: 0.46 + current.length * 0.08, fontSize: 26, color: '#FFFFFF', fontStyle: 'BOLD', rotation: 0 },
    ]);
    setOverlayDraft('');
  };

  const removeMusic = (event) => {
    event.stopPropagation();
    setSelectedMusic(null);
  };

  const canSubmit =
    !loading &&
    ((type === 'TEXT' && text.trim().length > 0 && text.length <= 1000) ||
      ((type === 'IMAGE' || type === 'VIDEO') && fileItem));

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      let uploadId = null;
      if (type === 'IMAGE' || type === 'VIDEO') {
        const uploaded = await chatApi.uploadFile(fileItem.file);
        uploadId = uploaded.uploadId;
        if (!uploadId) throw new Error('Không lấy được uploadId.');
      }

      const payload = {
        type,
        privacy,
        uploadId,
        text: type === 'TEXT' ? text.trim() : null,
        backgroundColor: type === 'TEXT' ? backgroundColor : null,
        textColor: type === 'TEXT' ? textColor : null,
        textOverlays: overlays,
        musicTrackId: selectedMusic?.musicTrackId || null,
        musicStartMs: selectedMusic ? Number(selectedMusic.musicStartMs) : null,
        musicDurationMs: selectedMusic ? Number(selectedMusic.musicDurationMs) : null,
        musicVolume: selectedMusic ? Number(selectedMusic.musicVolume) : null,
      };

      const created = await storyApi.createStory(payload);
      onCreated(created);
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Không thể đăng tin.';
      setError(message.includes('nhac') || message.includes('music') ? 'Bản nhạc này không còn khả dụng. Vui lòng chọn bản nhạc khác.' : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-[#3e4042] bg-[#242526] text-[#e4e6eb] shadow-2xl">
        <aside className="w-full max-w-[340px] overflow-y-auto border-r border-[#3e4042] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Tạo tin mới</h2>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-[#b0b3b8] hover:bg-[#3a3b3c]" aria-label="Đóng tạo tin">
              <X size={19} />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <Avatar name={currentUser?.userName} src={currentUser?.avatarUrl} />
            <div className="min-w-0">
              <p className="truncate font-bold text-white">{currentUser?.userName || 'Bạn'}</p>
              <select value={privacy} onChange={(event) => setPrivacy(event.target.value)} className="mt-1 rounded-lg bg-[#3a3b3c] px-2 py-1 text-xs text-white outline-none">
                {PRIVACY.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['TEXT', Type, 'Văn bản'],
              ['IMAGE', ImageIcon, 'Ảnh'],
              ['VIDEO', Film, 'Video'],
            ].map(([value, Icon, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => selectType(value)}
                className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${
                  type === value ? 'border-[#1877f2] bg-[#1877f2]/15 text-white' : 'border-[#3e4042] bg-[#18191a] text-[#b0b3b8] hover:bg-[#3a3b3c]'
                }`}
              >
                <Icon className="mx-auto mb-1" size={18} />
                {label}
              </button>
            ))}
          </div>

          {type === 'TEXT' ? (
            <div className="mt-4 space-y-3">
              <textarea
                value={text}
                maxLength={1000}
                rows={5}
                onChange={(event) => setText(event.target.value)}
                placeholder="Bắt đầu viết tin của bạn..."
                className="w-full resize-none rounded-xl border border-[#3e4042] bg-[#18191a] px-3 py-3 text-sm text-white outline-none placeholder:text-[#8a8d91] focus:border-[#1877f2]"
              />
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-[#b0b3b8]">Nền</p>
                <div className="flex flex-wrap gap-2">
                  {TEXT_BACKGROUNDS.map((color) => (
                    <button key={color} type="button" onClick={() => setBackgroundColor(color)} className={`h-8 w-8 rounded-full border-2 ${backgroundColor === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-[#b0b3b8]">Màu chữ</p>
                <div className="flex flex-wrap gap-2">
                  {TEXT_COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setTextColor(color)} className={`h-8 w-8 rounded-full border-2 ${textColor === color ? 'border-[#1877f2]' : 'border-[#3e4042]'}`} style={{ backgroundColor: color }} title={color} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <input ref={fileInputRef} type="file" accept={type === 'IMAGE' ? 'image/*' : 'video/*'} className="hidden" onChange={pickFile} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3a3b3c] px-4 py-3 text-sm font-bold text-white hover:bg-[#4e4f50]">
                {type === 'IMAGE' ? <ImageIcon size={18} /> : <Film size={18} />}
                Chọn {type === 'IMAGE' ? 'ảnh' : 'video'}
              </button>
              <div className="rounded-xl border border-[#3e4042] p-3">
                <div className="mb-2 flex gap-2">
                  <input value={overlayDraft} maxLength={300} onChange={(event) => setOverlayDraft(event.target.value)} placeholder="Thêm chữ lên tin..." className="min-w-0 flex-1 rounded-lg bg-[#18191a] px-3 py-2 text-sm text-white outline-none" />
                  <button type="button" onClick={addOverlay} disabled={!overlayDraft.trim() || overlays.length >= 10} className="rounded-lg bg-[#1877f2] px-3 py-2 text-sm font-bold text-white disabled:opacity-40">Thêm</button>
                </div>
                <p className="text-xs text-[#8a8d91]">{overlays.length} / 10 overlay. Vị trí mặc định ở giữa để dễ test.</p>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-[#3e4042] p-3">
            <button type="button" onClick={() => setMusicPickerOpen(true)} className="flex w-full items-center justify-between gap-3 text-sm font-bold text-white">
              <span className="inline-flex items-center gap-2"><Music size={17} /> Âm nhạc</span>
              <span className="truncate text-xs text-[#b0b3b8]">{selectedMusic ? selectedMusic.track.title : 'Tùy chọn'}</span>
            </button>
            {selectedMusic && (
              <button type="button" onClick={() => setMusicPickerOpen(true)} className="mt-3 flex w-full items-center gap-3 rounded-xl bg-[#18191a] p-2 text-left hover:bg-[#3a3b3c]">
                <MusicThumb track={selectedMusic.track} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{selectedMusic.track.title}</p>
                  <p className="truncate text-xs text-[#b0b3b8]">
                    {selectedMusic.track.artist || 'Không rõ nghệ sĩ'} · {Math.round(Number(selectedMusic.musicDurationMs) / 1000)} giây
                  </p>
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={removeMusic}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      removeMusic(event);
                    }
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#b0b3b8] hover:bg-[#4e4f50] hover:text-white"
                  aria-label="Bỏ nhạc"
                >
                  <X size={16} />
                </span>
              </button>
            )}
          </div>

          {error && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <button type="button" onClick={submit} disabled={!canSubmit} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877f2] py-3 text-sm font-black text-white hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-40">
            {loading && <Loader2 size={17} className="animate-spin" />}
            {loading ? 'Đang đăng tin...' : 'Chia sẻ lên tin'}
          </button>
        </aside>

        <div className="hidden flex-1 items-center justify-center bg-[#18191a] p-6 md:flex">
          <div className="relative flex h-[72vh] max-h-[720px] w-[390px] items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl">
            {type === 'TEXT' ? (
              <div className="flex h-full w-full items-center justify-center px-8 text-center text-3xl font-black leading-tight" style={{ backgroundColor, color: textColor }}>
                {text || 'Tin văn bản'}
              </div>
            ) : fileItem ? (
              fileItem.type === 'VIDEO' ? <video src={fileItem.previewUrl} className="h-full w-full object-contain" controls /> : <img src={fileItem.previewUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <div className="px-8 text-center text-sm text-[#b0b3b8]">Chọn file để xem trước story.</div>
            )}
            {type !== 'TEXT' && renderOverlays({ textOverlays: overlays })}
            {selectedMusic && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-white backdrop-blur">
                <MusicThumb track={selectedMusic.track} size="h-8 w-8" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">{selectedMusic.track.title}</p>
                  <p className="truncate text-[11px] text-white/75">{selectedMusic.track.artist || 'Không rõ nghệ sĩ'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {musicPickerOpen && (
        <MusicPickerModal
          initialSelection={selectedMusic}
          onSelect={(selection) => {
            setSelectedMusic(selection);
            setMusicPickerOpen(false);
          }}
          onClose={() => setMusicPickerOpen(false)}
        />
      )}
    </div>
  );
};

const StoryContent = ({ story, onVideoEnded, paused }) => {
  const videoRef = useRef(null);
  const mediaUrl = getMediaUrl(story);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) video.pause();
    else video.play().catch(() => {});
  }, [paused, story?.id]);

  if (story?.type === 'TEXT') {
    return (
      <div className="relative flex h-full w-full items-center justify-center px-8 text-center text-3xl font-black leading-tight" style={{ backgroundColor: safeColor(story.backgroundColor, '#1877F2'), color: safeColor(story.textColor, '#FFFFFF') }}>
        <p className="max-h-full overflow-hidden whitespace-pre-wrap break-words">{story.text}</p>
        {renderOverlays(story)}
      </div>
    );
  }

  if (!mediaUrl) {
    return <div className="flex h-full items-center justify-center px-8 text-center text-sm text-[#b0b3b8]">Không thể tải nội dung tin.</div>;
  }

  return (
    <div className="relative h-full w-full bg-black">
      {story?.type === 'VIDEO' ? (
        <video ref={videoRef} src={mediaUrl} className="h-full w-full object-contain" autoPlay playsInline controls onEnded={onVideoEnded} />
      ) : (
        <img src={mediaUrl} alt="" className="h-full w-full object-contain" />
      )}
      {renderOverlays(story)}
    </div>
  );
};

const StoryViewersSheet = ({ story, onClose }) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalViews, setTotalViews] = useState(story?.totalViews || 0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextPage, append = false) => {
    setLoading(true);
    try {
      const data = await storyApi.getViewers(story.id, nextPage, 50);
      setItems((current) => append ? [...current, ...(data.items || [])] : (data.items || []));
      setTotalPages(data.totalPages || 0);
      setTotalViews(data.totalViews || 0);
      setPage(data.page ?? nextPage);
    } finally {
      setLoading(false);
    }
  }, [story.id]);

  useEffect(() => {
    load(0);
  }, [load]);

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-2xl border border-[#3e4042] bg-[#242526] p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-white">Người xem · {totalViews}</h3>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#b0b3b8] hover:bg-[#3a3b3c]" aria-label="Đóng người xem"><X size={17} /></button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {items.map((viewer) => {
          const reaction = getReactionMeta(viewer.reactionType);

          return (
            <div key={`${viewer.userId}-${viewer.viewedAt}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[#3a3b3c]">
              <Avatar name={viewer.userName} src={viewer.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{viewer.userName}</p>
                <p className="text-xs text-[#b0b3b8]">{formatRelativeTime(viewer.viewedAt)}</p>
              </div>
              {reaction && (
                <span title={reaction.label} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-lg shadow-sm">
                  {reaction.icon}
                </span>
              )}
            </div>
          );
        })}
        {!loading && items.length === 0 && <p className="py-4 text-center text-sm text-[#b0b3b8]">Chưa có người xem.</p>}
      </div>
      {page < totalPages - 1 && (
        <button type="button" onClick={() => load(page + 1, true)} className="mt-2 w-full rounded-xl bg-[#3a3b3c] py-2 text-sm font-bold text-white">
          {loading ? 'Đang tải...' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
};

const StoryViewer = ({ feed, startAuthorIndex, startStoryIndex, currentUser, onClose, onFeedChange }) => {
  const [authorIndex, setAuthorIndex] = useState(startAuthorIndex);
  const [storyIndex, setStoryIndex] = useState(startStoryIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const storyAudioRef = useRef(null);
  const activeGroup = feed[authorIndex];
  const activeStory = activeGroup?.stories?.[storyIndex];
  const activeStoryId = activeStory?.id;
  const activeStoryType = activeStory?.type;
  const activeMusic = activeStory?.music;
  const isOwner = String(activeStory?.author?.id || activeGroup?.authorId || '') === String(currentUser?.id || '');

  const updateStory = useCallback((storyId, patcher) => {
    onFeedChange((current) => compactFeed(current.map((group) => {
      const stories = group.stories.map((story) => story.id === storyId ? patcher(story) : story);
      return {
        ...group,
        stories,
        hasUnseenStory: stories.some((story) => !story.seen),
      };
    })));
  }, [onFeedChange]);

  const nextStory = useCallback(() => {
    if (!activeGroup) return;
    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex((current) => current + 1);
      setProgress(0);
      return;
    }
    if (authorIndex < feed.length - 1) {
      setAuthorIndex((current) => current + 1);
      setStoryIndex(findStartStoryIndex(feed[authorIndex + 1]));
      setProgress(0);
      return;
    }
    onClose();
  }, [activeGroup, authorIndex, feed, onClose, storyIndex]);

  const previousStory = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((current) => current - 1);
      setProgress(0);
      return;
    }
    if (authorIndex > 0) {
      const previousGroup = feed[authorIndex - 1];
      setAuthorIndex((current) => current - 1);
      setStoryIndex(Math.max(0, previousGroup.stories.length - 1));
      setProgress(0);
    }
  }, [authorIndex, feed, storyIndex]);

  useEffect(() => {
    if (!activeStoryId) {
      onClose();
      return;
    }
    setProgress(0);
    setShowViewers(false);
    setFeedback('');
    if (!isOwner) {
      storyApi.viewStory(activeStoryId)
        .then(() => updateStory(activeStoryId, (story) => ({ ...story, seen: true })))
        .catch((err) => {
          setFeedback(err?.response?.data?.message || 'Không ghi được lượt xem tin.');
        });
    }
  }, [activeStoryId, isOwner, onClose, updateStory]);

  useEffect(() => {
    if (!activeStoryId || paused || activeStoryType === 'VIDEO') return undefined;
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = current + 2;
        if (next >= 100) {
          setTimeout(nextStory, 0);
          return 100;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [activeStoryId, activeStoryType, nextStory, paused]);

  useEffect(() => {
    const audio = storyAudioRef.current || new Audio();
    storyAudioRef.current = audio;
    audio.pause();

    if (!activeMusic?.audioUrl) {
      audio.removeAttribute('src');
      return undefined;
    }

    const startSecond = Number(activeMusic.startMs || 0) / 1000;
    const endSecond = (Number(activeMusic.startMs || 0) + Number(activeMusic.durationMs || 0)) / 1000;
    audio.src = activeMusic.audioUrl;
    audio.volume = clamp(Number(activeMusic.volume ?? 1), 0, 1);
    audio.currentTime = startSecond;

    const play = () => {
      audio.play().catch(() => {});
    };

    const onTimeUpdate = () => {
      if (Number(activeMusic.durationMs || 0) <= 0) return;
      if (audio.currentTime >= endSecond) {
        audio.currentTime = startSecond;
        play();
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    play();

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [activeMusic, activeStoryId]);

  useEffect(() => {
    const audio = storyAudioRef.current;
    if (!audio || !activeMusic?.audioUrl) return;
    if (paused) audio.pause();
    else audio.play().catch(() => {});
  }, [activeMusic?.audioUrl, paused]);

  useEffect(() => () => {
    storyAudioRef.current?.pause();
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select', 'button'].includes(tag)) return;
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') nextStory();
      if (event.key === 'ArrowLeft') previousStory();
      if (event.key === ' ') {
        event.preventDefault();
        setPaused((current) => !current);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextStory, onClose, previousStory]);

  const react = async (type) => {
    if (!activeStory || isOwner) return;
    const oldReaction = activeStory.myReaction;
    const oldCount = activeStory.reactionCount || 0;
    const removing = oldReaction === type;
    updateStory(activeStory.id, (story) => ({
      ...story,
      myReaction: removing ? null : type,
      reactionCount: removing ? Math.max(0, oldCount - 1) : oldReaction ? oldCount : oldCount + 1,
    }));
    try {
      if (removing) await storyApi.removeReaction(activeStory.id);
      else await storyApi.react(activeStory.id, type);
    } catch {
      updateStory(activeStory.id, (story) => ({ ...story, myReaction: oldReaction, reactionCount: oldCount }));
    }
  };

  const submitReply = async () => {
    const content = replyText.trim();
    if (!activeStory || !content || replying || isOwner) return;
    setReplying(true);
    setFeedback('');
    try {
      const clientMessageId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await storyApi.reply(activeStoryId, clientMessageId, content);
      setReplyText('');
      setFeedback('Đã gửi');
      setTimeout(() => setFeedback(''), 1600);
    } catch (err) {
      setFeedback(err?.response?.data?.message || 'Không gửi được phản hồi.');
    } finally {
      setReplying(false);
    }
  };

  const deleteStory = async () => {
    if (!activeStory || !isOwner) return;
    const ok = window.confirm('Xóa tin này? Người khác sẽ không thể xem nữa.');
    if (!ok) return;
    await storyApi.deleteStory(activeStory.id);
    onFeedChange((current) => compactFeed(current.map((group) => ({ ...group, stories: group.stories.filter((story) => story.id !== activeStory.id) }))));
    nextStory();
  };

  if (!activeStory) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black text-white">
      <button type="button" onClick={onClose} className="absolute left-4 top-4 z-20 rounded-full bg-[#242526] p-2 text-[#e4e6eb] hover:bg-[#3a3b3c]" aria-label="Đóng story">
        <X size={22} />
      </button>

      <div className="relative h-[100dvh] w-full max-w-[480px] overflow-hidden bg-black shadow-2xl sm:h-[94vh] sm:rounded-2xl">
        <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/75 to-transparent p-4">
          <div className="mb-3 flex gap-1">
            {activeGroup.stories.map((story, index) => (
              <div key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/35">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${index < storyIndex ? 100 : index === storyIndex ? progress : 0}%` }} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={activeGroup.authorName} src={activeGroup.avatarUrl} ring seen={!activeGroup.hasUnseenStory} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{activeGroup.authorName}</p>
              <p className="text-xs text-white/70">{formatRelativeTime(activeStory.createdAt)}</p>
            </div>
            {isOwner && (
              <div className="relative">
                <button type="button" onClick={() => setShowMenu((current) => !current)} className="rounded-full p-2 hover:bg-white/10" aria-label="Tùy chọn story"><MoreHorizontal size={20} /></button>
                {showMenu && (
                  <div className="absolute right-0 top-10 w-44 rounded-xl border border-[#3e4042] bg-[#242526] p-1 shadow-2xl">
                    <button type="button" onClick={deleteStory} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-rose-300 hover:bg-[#3a3b3c]">
                      <Trash2 size={16} />
                      Xóa tin
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <StoryMusicBadge music={activeMusic} />

        <button type="button" onClick={previousStory} className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 hover:bg-black/55" aria-label="Story trước">
          <ChevronLeft size={28} />
        </button>
        <button type="button" onClick={nextStory} className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 hover:bg-black/55" aria-label="Story tiếp">
          <ChevronRight size={28} />
        </button>

        <div onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} className="h-full">
          <StoryContent story={activeStory} paused={paused} onVideoEnded={nextStory} />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
          {isOwner ? (
            <button type="button" onClick={() => setShowViewers(true)} className="inline-flex items-center gap-2 rounded-full bg-black/35 px-4 py-2 text-sm font-bold text-white hover:bg-black/55">
              <Eye size={18} />
              Người xem
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center gap-2">
                {REACTIONS.map((reaction) => (
                  <button key={reaction.type} type="button" onClick={() => react(reaction.type)} title={reaction.label} className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl transition hover:scale-110 ${activeStory.myReaction === reaction.type ? 'bg-white text-black' : 'bg-black/35'}`}>
                    {reaction.icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={replyText} onChange={(event) => setReplyText(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submitReply()} placeholder={`Trả lời ${activeGroup.authorName || 'tin'}...`} className="min-w-0 flex-1 rounded-full border border-white/25 bg-black/30 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/70 focus:border-white" />
                <button type="button" onClick={submitReply} disabled={!replyText.trim() || replying} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877f2] text-white disabled:opacity-50">
                  {replying ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                </button>
              </div>
              {feedback && <p className="text-center text-xs font-semibold text-white/80">{feedback}</p>}
            </div>
          )}
        </div>

        {showViewers && <StoryViewersSheet story={activeStory} onClose={() => setShowViewers(false)} />}
      </div>
    </div>
  );
};

const StoryBar = ({ currentUser }) => {
  const { isConnected, wsService } = useWebSocket();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerStart, setViewerStart] = useState(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await storyApi.getFeed();
      setFeed(compactFeed(data));
    } catch (err) {
      setError(err?.response?.data?.message || 'Không tải được tin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (!isConnected || !wsService) return undefined;
    const handler = (event) => {
      setFeed((current) => compactFeed(current.map((group) => ({
        ...group,
        stories: group.stories.map((story) => {
          if (story.id !== event.storyId) return story;
          const currentCount = story.reactionCount || 0;
          if (event.action === 'ADD') return { ...story, reactionCount: currentCount + 1 };
          if (event.action === 'REMOVE') return { ...story, reactionCount: Math.max(0, currentCount - 1) };
          return story;
        }),
      }))));
    };
    wsService.subscribe('/user/queue/story.reactions', handler);
    return () => wsService.unsubscribe('/user/queue/story.reactions', handler);
  }, [isConnected, wsService]);

  const ownGroup = useMemo(() => feed.find((group) => String(group.authorId) === String(currentUser?.id)), [feed, currentUser?.id]);
  const visibleFeed = useMemo(() => feed.filter((group) => String(group.authorId) !== String(currentUser?.id)), [feed, currentUser?.id]);
  const viewerFeed = useMemo(() => compactFeed([...(ownGroup ? [ownGroup] : []), ...visibleFeed]), [ownGroup, visibleFeed]);

  const openGroup = (group) => {
    const authorIndex = viewerFeed.findIndex((item) => String(item.authorId) === String(group.authorId));
    if (authorIndex < 0) return;
    setViewerStart({ authorIndex, storyIndex: findStartStoryIndex(viewerFeed[authorIndex]) });
  };

  const handleCreated = (created) => {
    setFeed((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((group) => String(group.authorId) === String(currentUser?.id));
      if (existingIndex >= 0) {
        next[existingIndex] = {
          ...next[existingIndex],
          hasUnseenStory: false,
          stories: [created, ...next[existingIndex].stories],
        };
      } else {
        next.unshift({
          authorId: currentUser?.id,
          authorName: currentUser?.userName,
          avatarUrl: currentUser?.avatarUrl,
          hasUnseenStory: false,
          stories: [created],
        });
      }
      return compactFeed(next);
    });
  };

  return (
    <section className="rounded-2xl border border-[#2f3031] bg-[#242526] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[#b0b3b8]">Tin</p>
          <h2 className="text-lg font-bold text-white">Stories</h2>
        </div>
        <button type="button" onClick={loadFeed} className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c] hover:text-white">
          Làm mới
        </button>
      </div>

      {error && <p className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

      <div className="relative">
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          <CreateStoryCard currentUser={currentUser} ownGroup={ownGroup} onClick={() => ownGroup ? openGroup(ownGroup) : setComposerOpen(true)} />
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[210px] w-[132px] shrink-0 animate-pulse rounded-xl bg-[#3a3b3c]" />)
          ) : (
            visibleFeed.map((group) => <StoryCard key={group.authorId} group={group} onClick={() => openGroup(group)} />)
          )}
          {!loading && visibleFeed.length === 0 && !ownGroup && (
            <button type="button" onClick={() => setComposerOpen(true)} className="flex h-[210px] min-w-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-[#3e4042] px-5 text-center text-sm text-[#b0b3b8]">
              <Plus className="mb-2 text-[#1877f2]" />
              Chưa có tin nào. Tạo tin đầu tiên của bạn.
            </button>
          )}
        </div>
      </div>

      {ownGroup && (
        <button type="button" onClick={() => setComposerOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#3a3b3c] px-3 py-2 text-sm font-bold text-white hover:bg-[#4e4f50]">
          <Plus size={17} />
          Thêm tin mới
        </button>
      )}

      {composerOpen && <StoryComposer currentUser={currentUser} onClose={() => setComposerOpen(false)} onCreated={handleCreated} />}
      {viewerStart && viewerFeed.length > 0 && (
        <StoryViewer
          feed={viewerFeed}
          startAuthorIndex={viewerStart.authorIndex}
          startStoryIndex={viewerStart.storyIndex}
          currentUser={currentUser}
          onClose={() => setViewerStart(null)}
          onFeedChange={setFeed}
        />
      )}
    </section>
  );
};

export default StoryBar;

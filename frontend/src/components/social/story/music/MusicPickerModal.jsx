import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Loader2, Music, Pause, Play, Search, Volume2, VolumeX, X } from 'lucide-react';
import { musicApi } from '../../../../services/api';

const PAGE_SIZE = 20;
const DEFAULT_CLIP_MS = 15000;

const formatDurationMs = (durationMs) => {
  const totalSeconds = Math.max(0, Math.floor(Number(durationMs || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const isCanceled = (error) => error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const uniqueTracks = (tracks) => {
  const byId = new Map();
  tracks.forEach((track) => {
    if (track?.id != null) byId.set(track.id, track);
  });
  return [...byId.values()];
};

const getInitialDuration = (track, initialSelection) => {
  const trackDuration = Number(track?.durationMs || 0);
  const requested = Number(initialSelection?.musicDurationMs || DEFAULT_CLIP_MS);
  if (trackDuration <= 0) return requested > 0 ? requested : DEFAULT_CLIP_MS;
  return clamp(requested, 1000, trackDuration);
};

const MusicCover = ({ track, size = 'h-12 w-12' }) => (
  <div className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#3a3b3c] text-[#b0b3b8]`}>
    {track?.coverUrl ? (
      <img src={track.coverUrl} alt={track.title || 'Cover'} loading="lazy" className="h-full w-full object-cover" />
    ) : (
      <Music size={22} />
    )}
  </div>
);

const MusicPickerModal = ({ initialSelection, onSelect, onClose }) => {
  const [mode, setMode] = useState(initialSelection?.track ? 'segment' : 'list');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [selectedTrack, setSelectedTrack] = useState(initialSelection?.track || null);
  const [startMs, setStartMs] = useState(Number(initialSelection?.musicStartMs || 0));
  const [durationMs, setDurationMs] = useState(
    initialSelection?.track ? getInitialDuration(initialSelection.track, initialSelection) : DEFAULT_CLIP_MS
  );
  const [volume, setVolume] = useState(Number(initialSelection?.musicVolume ?? 1));
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [playingSegment, setPlayingSegment] = useState(false);
  const requestSeqRef = useRef(0);
  const audioRef = useRef(null);

  const cleanAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    setPlayingTrackId(null);
    setPlayingSegment(false);
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'none';

    return () => {
      cleanAudio();
      audioRef.current = null;
    };
  }, [cleanAudio]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadTracks = useCallback(async (nextPage = 0, append = false, signal) => {
    const search = debouncedQuery.trim();
    const seq = ++requestSeqRef.current;
    setError('');
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const data = search
        ? await musicApi.searchTracks(search, nextPage, PAGE_SIZE, { signal })
        : await musicApi.getTracks(nextPage, PAGE_SIZE, { signal });

      if (seq !== requestSeqRef.current || signal?.aborted) return;

      const content = data.content || [];
      setTracks((current) => append ? uniqueTracks([...current, ...content]) : uniqueTracks(content));
      setPage(data.number ?? nextPage);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      if (!isCanceled(err)) {
        setError(err?.response?.data?.message || 'Không thể tải danh sách nhạc.');
      }
    } finally {
      if (seq === requestSeqRef.current && !signal?.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const controller = new AbortController();
    setTracks([]);
    setPage(0);
    setTotalPages(0);
    loadTracks(0, false, controller.signal);
    return () => controller.abort();
  }, [debouncedQuery, loadTracks]);

  const hasMore = page < totalPages - 1;

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    const controller = new AbortController();
    loadTracks(page + 1, true, controller.signal);
  };

  const playTrack = async (track, segment = false) => {
    const audio = audioRef.current;
    if (!audio || !track?.audioUrl) return;

    setAudioError('');
    const sameTrack = playingTrackId === track.id;
    const sameSegmentMode = segment === playingSegment;

    if (sameTrack && sameSegmentMode && !audio.paused) {
      audio.pause();
      setPlayingTrackId(null);
      setPlayingSegment(false);
      return;
    }

    audio.pause();
    audio.src = track.audioUrl;
    audio.volume = clamp(Number(volume), 0, 1);
    audio.currentTime = segment ? Number(startMs) / 1000 : 0;
    setPlayingTrackId(track.id);
    setPlayingSegment(segment);

    try {
      await audio.play();
    } catch {
      setPlayingTrackId(null);
      setPlayingSegment(false);
      setAudioError('Không thể phát bản nhạc này.');
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onEnded = () => {
      setPlayingTrackId(null);
      setPlayingSegment(false);
    };

    const onError = () => {
      setPlayingTrackId(null);
      setPlayingSegment(false);
      setAudioError('Không thể phát bản nhạc này.');
    };

    const onTimeUpdate = () => {
      if (!playingSegment || !selectedTrack) return;
      const endSecond = (Number(startMs) + Number(durationMs)) / 1000;
      if (audio.currentTime >= endSecond) {
        audio.currentTime = Number(startMs) / 1000;
        audio.play().catch(() => {});
      }
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [durationMs, playingSegment, selectedTrack, startMs]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = clamp(Number(volume), 0, 1);
  }, [volume]);

  const selectTrack = (track) => {
    cleanAudio();
    setSelectedTrack(track);
    setStartMs(0);
    setDurationMs(Math.min(DEFAULT_CLIP_MS, Number(track.durationMs || DEFAULT_CLIP_MS)));
    setVolume(1);
    setMode('segment');
  };

  const maxStartMs = useMemo(() => {
    if (!selectedTrack?.durationMs) return 0;
    return Math.max(0, Number(selectedTrack.durationMs) - Number(durationMs));
  }, [durationMs, selectedTrack]);

  const validSegment = selectedTrack && Number(durationMs) > 0 && Number(startMs) >= 0 &&
    Number(startMs) + Number(durationMs) <= Number(selectedTrack.durationMs || 0) &&
    Number(volume) >= 0 && Number(volume) <= 1;

  const applyDuration = (nextDuration) => {
    if (!selectedTrack) return;
    const trackDuration = Number(selectedTrack.durationMs || nextDuration);
    const safeDuration = clamp(nextDuration, 1000, trackDuration);
    setDurationMs(safeDuration);
    setStartMs((current) => Math.min(Number(current), Math.max(0, trackDuration - safeDuration)));
  };

  const confirm = () => {
    if (!validSegment) return;
    cleanAudio();
    onSelect({
      track: selectedTrack,
      musicTrackId: selectedTrack.id,
      musicStartMs: Number(startMs),
      musicDurationMs: Number(durationMs),
      musicVolume: Number(volume),
    });
  };

  const goBack = () => {
    cleanAudio();
    setMode('list');
  };

  const close = () => {
    cleanAudio();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-0 text-[#e4e6eb] sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-[540px] flex-col overflow-hidden bg-[#242526] shadow-2xl sm:h-[82vh] sm:rounded-2xl sm:border sm:border-[#3e4042]">
        <header className="flex shrink-0 items-center gap-2 border-b border-[#3e4042] px-4 py-3">
          <button type="button" onClick={mode === 'segment' ? goBack : close} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#3a3b3c]" aria-label="Quay lại">
            <ArrowLeft size={21} />
          </button>
          <h2 className="flex-1 text-center text-lg font-black text-white">{mode === 'segment' ? 'Chọn đoạn nhạc' : 'Thêm nhạc'}</h2>
          <button type="button" onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#3a3b3c]" aria-label="Đóng chọn nhạc">
            <X size={20} />
          </button>
        </header>

        {mode === 'list' ? (
          <>
            <div className="shrink-0 border-b border-[#3e4042] p-4">
              <div className="flex items-center gap-2 rounded-full bg-[#3a3b3c] px-4 py-2.5">
                <Search size={18} className="text-[#b0b3b8]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm kiếm bài hát hoặc nghệ sĩ"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#b0b3b8]"
                />
                {loading && <Loader2 size={16} className="animate-spin text-[#b0b3b8]" />}
              </div>
            </div>

            {error && (
              <div className="mx-4 mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">
                <p>{error}</p>
                <button type="button" onClick={() => loadTracks(0)} className="mt-2 font-bold text-white">Thử lại</button>
              </div>
            )}

            {audioError && <p className="mx-4 mt-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{audioError}</p>}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {loading && tracks.length === 0 ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
                    <div className="h-12 w-12 animate-pulse rounded-xl bg-[#3a3b3c]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-[#3a3b3c]" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-[#3a3b3c]" />
                    </div>
                  </div>
                ))
              ) : (
                tracks.map((track) => {
                  const playing = playingTrackId === track.id && !playingSegment;
                  return (
                    <div key={track.id} className={`group mb-1 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-[#3a3b3c] ${selectedTrack?.id === track.id ? 'bg-[#1877f2]/10' : ''}`}>
                      <MusicCover track={track} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-white">{track.title}</p>
                        <p className="truncate text-xs text-[#b0b3b8]">{track.artist || 'Không rõ nghệ sĩ'} · {formatDurationMs(track.durationMs)}</p>
                      </div>
                      <button type="button" onClick={() => playTrack(track)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a3b3c] text-white hover:bg-[#4e4f50]" aria-label={playing ? `Tạm dừng ${track.title}` : `Phát ${track.title}`}>
                        {playing ? <Pause size={17} /> : <Play size={17} />}
                      </button>
                      <button type="button" onClick={() => selectTrack(track)} className="flex h-9 w-16 items-center justify-center rounded-full bg-[#1877f2] text-sm font-black text-white hover:bg-[#166fe5]" aria-label={`Chọn ${track.title}`}>
                        Chọn
                      </button>
                    </div>
                  );
                })
              )}

              {!loading && tracks.length === 0 && (
                <div className="flex h-44 flex-col items-center justify-center text-center text-sm text-[#b0b3b8]">
                  <Music className="mb-3 text-[#1877f2]" size={30} />
                  <p>{debouncedQuery ? `Không tìm thấy bài hát phù hợp với "${debouncedQuery}".` : 'Chưa có bản nhạc khả dụng.'}</p>
                  {debouncedQuery && <button type="button" onClick={() => setQuery('')} className="mt-3 rounded-full bg-[#3a3b3c] px-4 py-2 font-bold text-white">Xóa tìm kiếm</button>}
                </div>
              )}

              {hasMore && (
                <button type="button" onClick={loadMore} disabled={loadingMore} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3a3b3c] py-2.5 text-sm font-black text-white hover:bg-[#4e4f50] disabled:opacity-50">
                  {loadingMore && <Loader2 size={16} className="animate-spin" />}
                  Xem thêm
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[#18191a] p-3">
              <MusicCover track={selectedTrack} size="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-white">{selectedTrack?.title}</p>
                <p className="truncate text-sm text-[#b0b3b8]">{selectedTrack?.artist || 'Không rõ nghệ sĩ'}</p>
                <p className="mt-1 text-xs text-[#8a8d91]">{formatDurationMs(selectedTrack?.durationMs)}</p>
              </div>
              <button type="button" onClick={() => playTrack(selectedTrack, true)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877f2] text-white hover:bg-[#166fe5]" aria-label={playingSegment ? `Tạm dừng ${selectedTrack?.title}` : `Phát đoạn đã chọn`}>
                {playingSegment ? <Pause size={19} /> : <Play size={19} />}
              </button>
            </div>

            {audioError && <p className="mb-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">{audioError}</p>}

            <div className="rounded-2xl border border-[#3e4042] bg-[#18191a] p-4">
              <div className="mb-3 flex items-center justify-between text-sm font-bold text-[#b0b3b8]">
                <span>{formatDurationMs(startMs)}</span>
                <span>{formatDurationMs(Number(startMs) + Number(durationMs))}</span>
              </div>
              <input
                type="range"
                min="0"
                max={maxStartMs}
                step="500"
                value={Math.min(Number(startMs), maxStartMs)}
                onChange={(event) => setStartMs(Number(event.target.value))}
                className="w-full accent-[#1877f2]"
                aria-label="Vị trí bắt đầu đoạn nhạc"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-[#8a8d91]">
                <span>0:00</span>
                <span>{formatDurationMs(selectedTrack?.durationMs)}</span>
              </div>
              <p className="mt-4 text-center text-sm font-black text-white">Đoạn đã chọn: {Math.round(Number(durationMs) / 1000)} giây</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[5000, 10000, 15000].map((preset) => (
                  <button key={preset} type="button" onClick={() => applyDuration(preset)} className={`rounded-full px-3 py-2 text-xs font-black ${Number(durationMs) === preset ? 'bg-[#1877f2] text-white' : 'bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50]'}`}>
                    {preset / 1000}s
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#3e4042] bg-[#18191a] p-4">
              <label className="mb-3 block text-sm font-black text-white">Âm lượng</label>
              <div className="flex items-center gap-3">
                <VolumeX size={18} className="text-[#b0b3b8]" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={Math.round(Number(volume) * 100)}
                  onChange={(event) => setVolume(Number(event.target.value) / 100)}
                  className="min-w-0 flex-1 accent-[#1877f2]"
                  aria-label="Âm lượng nhạc"
                />
                <Volume2 size={18} className="text-[#b0b3b8]" />
                <span className="w-10 text-right text-xs font-bold text-[#b0b3b8]">{Math.round(Number(volume) * 100)}%</span>
              </div>
            </div>

            {!validSegment && (
              <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-300">
                Đoạn nhạc không hợp lệ. Start + duration không được vượt quá độ dài bài hát.
              </p>
            )}

            <button type="button" onClick={confirm} disabled={!validSegment} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877f2] py-3 text-sm font-black text-white hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-50">
              <Check size={18} />
              Xong
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPickerModal;

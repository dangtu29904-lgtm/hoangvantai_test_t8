import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Edit3,
  Flag,
  MoreHorizontal,
  Send,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { feedApi, reportApi } from '../../../services/api';

const COMMENT_LIMIT = 2000;
const PAGE_LIMIT = 20;

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

const Avatar = ({ name, src, size = 'h-8 w-8' }) => (
  <button
    type="button"
    className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white`}
    tabIndex={-1}
  >
    {src ? (
      <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" />
    ) : (
      (name || 'U').charAt(0).toUpperCase()
    )}
  </button>
);

const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.message || error?.response?.data?.error;

  if (serverMessage) return serverMessage;
  if (status === 403) return 'Bạn không có quyền bình luận trên bài viết này.';
  if (status === 404) return 'Bài viết hoặc bình luận không còn tồn tại.';
  if (status === 400) return 'Nội dung bình luận chưa hợp lệ.';
  return 'Có lỗi xảy ra. Bạn thử lại nhé.';
};

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

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;

  return date.toLocaleDateString('vi-VN');
};

const isEdited = (comment) => {
  if (!comment?.createdAt || !comment?.updatedAt) return false;
  return new Date(comment.updatedAt).getTime() !== new Date(comment.createdAt).getTime();
};

const mergeById = (current, incoming) => {
  const byId = new Map();
  [...current, ...incoming].forEach((item) => {
    if (item?.id != null) byId.set(item.id, item);
  });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return Number(a.id || 0) - Number(b.id || 0);
  });
};

const removeByIdAndChildren = (items, commentId) => {
  const childrenByParent = new Map();
  items.forEach((item) => {
    if (item?.parentCommentId == null) return;
    const key = item.parentCommentId;
    childrenByParent.set(key, [...(childrenByParent.get(key) || []), item.id]);
  });

  const idsToRemove = new Set([commentId]);
  const queue = [commentId];
  while (queue.length > 0) {
    const id = queue.shift();
    (childrenByParent.get(id) || []).forEach((childId) => {
      if (!idsToRemove.has(childId)) {
        idsToRemove.add(childId);
        queue.push(childId);
      }
    });
  }

  return items.filter((item) => !idsToRemove.has(item.id));
};

const buildCommentTree = (items) => {
  const byId = new Map();
  const order = new Map();
  items.forEach((item, index) => {
    byId.set(item.id, item);
    order.set(item.id, index);
  });

  const roots = [];
  const repliesByRootId = new Map();
  const orphans = [];

  const findRoot = (comment) => {
    let current = comment;
    const seen = new Set([comment.id]);

    while (current?.parentCommentId != null) {
      const parent = byId.get(current.parentCommentId);
      if (!parent || seen.has(parent.id)) return null;
      if (parent.parentCommentId == null) return parent;
      seen.add(parent.id);
      current = parent;
    }

    return current;
  };

  items.forEach((item) => {
    if (item.parentCommentId == null) {
      roots.push(item);
      repliesByRootId.set(item.id, []);
      return;
    }

    const root = findRoot(item);
    if (!root || root.id === item.id) {
      orphans.push(item);
      return;
    }

    repliesByRootId.set(root.id, [...(repliesByRootId.get(root.id) || []), item]);
  });

  const byBackendOrder = (a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0);
  roots.sort(byBackendOrder);
  orphans.sort(byBackendOrder);
  repliesByRootId.forEach((replies, rootId) => {
    repliesByRootId.set(rootId, replies.sort(byBackendOrder));
  });

  return { roots, repliesByRootId, orphans };
};

const AutoGrowTextarea = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  minRows = 1,
  className = '',
}) => {
  const ref = useRef(null);
  const composingRef = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || composingRef.current || event.nativeEvent?.isComposing) return;
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      maxLength={COMMENT_LIMIT}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onCompositionStart={() => {
        composingRef.current = true;
      }}
      onCompositionEnd={() => {
        composingRef.current = false;
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={`max-h-40 min-h-[40px] w-full resize-none overflow-y-auto rounded-3xl border border-transparent bg-[#3a3b3c] px-4 py-2.5 text-sm leading-5 text-[#e4e6eb] outline-none placeholder:text-[#b0b3b8] focus:border-[#2d88ff] ${className}`}
    />
  );
};

const CommentComposer = ({
  currentUser,
  value,
  onChange,
  onSubmit,
  submitting,
  placeholder = 'Viết bình luận...',
  compact = false,
}) => {
  const trimmed = value.trim();
  const nearLimit = value.length >= 1850;
  const canSubmit = trimmed.length > 0 && value.length <= COMMENT_LIMIT && !submitting;

  return (
    <div className={`flex items-start gap-2 ${compact ? 'mt-2' : ''}`}>
      <Avatar name={currentUser?.userName} src={currentUser?.avatarUrl} size={compact ? 'h-7 w-7' : 'h-8 w-8'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-end gap-2">
          <AutoGrowTextarea
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            disabled={submitting}
            placeholder={placeholder}
            className={compact ? 'py-2 text-xs' : ''}
          />
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-white transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:bg-[#3a3b3c] disabled:text-[#8a8d91]"
            title="Gửi"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between px-2 text-[11px] text-[#8a8d91]">
          <span>Enter để gửi, Shift + Enter để xuống dòng</span>
          {nearLimit && <span className={value.length > COMMENT_LIMIT ? 'text-rose-400' : ''}>{value.length} / {COMMENT_LIMIT}</span>}
        </div>
      </div>
    </div>
  );
};

const CommentMenu = ({ isOwner, onEdit, onDelete, onReport, onProfile }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const run = (handler) => {
    setOpen(false);
    handler?.();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#b0b3b8] opacity-100 transition hover:bg-[#3a3b3c] hover:text-white sm:opacity-0 sm:group-hover/comment:opacity-100"
        title="Tùy chọn bình luận"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-56 rounded-xl border border-[#3e4042] bg-[#242526] p-1.5 text-sm shadow-2xl">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => run(onEdit)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[#e4e6eb] hover:bg-[#3a3b3c]"
              >
                <Edit3 size={15} />
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => run(onDelete)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-rose-400 hover:bg-[#3a3b3c]"
              >
                <Trash2 size={15} />
                Xóa
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => run(onReport)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[#e4e6eb] hover:bg-[#3a3b3c]"
              >
                <Flag size={15} />
                Báo cáo bình luận
              </button>
              <button
                type="button"
                onClick={() => run(onProfile)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-semibold text-[#e4e6eb] hover:bg-[#3a3b3c]"
              >
                <User size={15} />
                Xem trang cá nhân
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const EditCommentForm = ({ comment, onCancel, onSave, saving }) => {
  const [content, setContent] = useState(comment.content || '');
  const trimmed = content.trim();
  const canSave = trimmed.length > 0 && content.length <= COMMENT_LIMIT && trimmed !== (comment.content || '').trim() && !saving;

  const submit = () => {
    if (canSave) onSave(trimmed);
  };

  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-[#3a3b3c] p-3">
      <AutoGrowTextarea
        value={content}
        onChange={setContent}
        onSubmit={submit}
        disabled={saving}
        minRows={2}
        className="rounded-xl bg-[#242526]"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#b0b3b8]">
        <span>Esc để hủy</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 font-semibold hover:bg-[#4e4f50] hover:text-white"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="rounded-lg bg-[#1877f2] px-3 py-1.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#4e4f50] disabled:text-[#8a8d91]"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
      {content.length > 1850 && (
        <p className={`mt-1 px-1 text-right text-[11px] ${content.length > COMMENT_LIMIT ? 'text-rose-400' : 'text-[#8a8d91]'}`}>
          {content.length} / {COMMENT_LIMIT}
        </p>
      )}
    </div>
  );
};

const ConfirmDeleteModal = ({ comment, onClose, onConfirm, deleting }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#3e4042] bg-[#242526] shadow-2xl">
      <div className="flex items-center gap-3 border-b border-[#3e4042] px-5 py-4">
        <span className="rounded-full bg-rose-500/10 p-2 text-rose-400">
          <AlertTriangle size={20} />
        </span>
        <h2 className="text-lg font-bold text-white">Xóa bình luận?</h2>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm leading-6 text-[#b0b3b8]">Bạn có chắc muốn xóa bình luận này?</p>
        <div className="rounded-xl bg-[#18191a] p-3 text-sm text-[#e4e6eb]">{comment?.content}</div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl bg-[#3a3b3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4e4f50] disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {deleting ? 'Đang xóa...' : 'Xóa'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

const ReportCommentModal = ({ comment, onClose }) => {
  const [reason, setReason] = useState('SPAM');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await reportApi.reportComment(comment.id, {
        reason,
        description: description.trim(),
      });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#3e4042] bg-[#242526] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#3e4042] px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-full p-2 text-[#b0b3b8] hover:bg-[#3a3b3c]">
            <X size={18} />
          </button>
          <h2 className="text-lg font-bold text-white">Báo cáo bình luận</h2>
          <div className="w-9" />
        </div>

        {done ? (
          <div className="space-y-4 p-5 text-center">
            <p className="text-sm leading-6 text-[#e4e6eb]">Cảm ơn bạn. Báo cáo đã được gửi.</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#166fe5]"
            >
              Đóng
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white">Lý do báo cáo</label>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full rounded-xl border border-[#3e4042] bg-[#18191a] px-3 py-2.5 text-sm text-white outline-none focus:border-[#2d88ff]"
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
                maxLength={1000}
                rows={4}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Không bắt buộc"
                className="w-full resize-none rounded-xl border border-[#3e4042] bg-[#18191a] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#8a8d91] focus:border-[#2d88ff]"
              />
              <p className="mt-1 text-right text-[11px] text-[#8a8d91]">{description.length} / 1000</p>
            </div>
            {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50"
            >
              <Flag size={17} />
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CommentItem = ({
  comment,
  replies = [],
  currentUser,
  onReply,
  replyingToId,
  replyText,
  setReplyText,
  submitReply,
  submittingReply,
  onEdit,
  editingId,
  saveEdit,
  savingEdit,
  cancelEdit,
  onDelete,
  onReport,
  depth = 0,
}) => {
  const navigate = useNavigate();
  const isOwner = String(currentUser?.id || '') === String(comment.authorId || '');
  const editing = editingId === comment.id;

  const openProfile = () => {
    if (comment.authorId) navigate(`/profile/${comment.authorId}`);
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-[#3e4042] pl-3 sm:ml-10' : ''}`}>
      <div className="group/comment flex items-start gap-2.5">
        <button type="button" onClick={openProfile} className="shrink-0">
          <Avatar name={comment.authorName} src={comment.authorAvatarUrl} size={depth > 0 ? 'h-7 w-7' : 'h-8 w-8'} />
        </button>

        {editing ? (
          <EditCommentForm
            comment={comment}
            saving={savingEdit}
            onCancel={cancelEdit}
            onSave={(content) => saveEdit(comment.id, content)}
          />
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5">
              <div className="max-w-full rounded-2xl bg-[#3a3b3c] px-3.5 py-2 text-sm text-[#e4e6eb]">
                <button
                  type="button"
                  onClick={openProfile}
                  className="block max-w-full truncate text-left text-[13px] font-bold text-white hover:underline"
                >
                  {comment.authorName || 'Người dùng'}
                </button>
                <p className="whitespace-pre-wrap break-words text-[13px] leading-5 sm:text-sm">{comment.content}</p>
              </div>
              <CommentMenu
                isOwner={isOwner}
                onEdit={() => onEdit(comment.id)}
                onDelete={() => onDelete(comment)}
                onReport={() => onReport(comment)}
                onProfile={openProfile}
              />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 pl-2 text-xs font-semibold text-[#b0b3b8]">
              <button type="button" onClick={() => onReply(comment)} className="hover:text-white hover:underline">
                Trả lời
              </button>
              <span className="font-normal text-[#8a8d91]">·</span>
              <span className="font-normal text-[#8a8d91]">{formatRelativeTime(comment.createdAt)}</span>
              {isEdited(comment) && (
                <>
                  <span className="font-normal text-[#8a8d91]">·</span>
                  <span className="font-normal text-[#8a8d91]">Đã chỉnh sửa</span>
                </>
              )}
            </div>

            {replyingToId === comment.id && (
              <CommentComposer
                compact
                currentUser={currentUser}
                value={replyText}
                onChange={setReplyText}
                submitting={submittingReply}
                onSubmit={() => submitReply(comment.id)}
                placeholder={`Trả lời ${comment.authorName || 'bình luận'}...`}
              />
            )}
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="mt-2 space-y-3">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUser={currentUser}
              onReply={onReply}
              replyingToId={replyingToId}
              replyText={replyText}
              setReplyText={setReplyText}
              submitReply={submitReply}
              submittingReply={submittingReply}
              onEdit={onEdit}
              editingId={editingId}
              saveEdit={saveEdit}
              savingEdit={savingEdit}
              cancelEdit={cancelEdit}
              onDelete={onDelete}
              onReport={onReport}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentSkeleton = () => (
  <div className="flex items-start gap-3">
    <div className="h-8 w-8 rounded-full bg-[#3a3b3c]" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-40 rounded-full bg-[#3a3b3c]" />
      <div className="h-4 w-64 max-w-full rounded-full bg-[#3a3b3c]" />
    </div>
  </div>
);

const CommentSection = ({ postId, currentUser, initialCount = 0, onCountChange, onCountSet, onMutated }) => {
  const [comments, setComments] = useState([]);
  const [page, setPage] = useState(-1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(initialCount || 0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [composerText, setComposerText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const onCountSetRef = useRef(onCountSet);

  const tree = useMemo(() => buildCommentTree(comments), [comments]);
  const hasMore = totalPages > 0 && page < totalPages - 1;

  useEffect(() => {
    onCountSetRef.current = onCountSet;
  }, [onCountSet]);

  const loadPage = useCallback(async (nextPage, replace = false) => {
    if (replace) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError('');

    try {
      const data = await feedApi.getComments(postId, nextPage, PAGE_LIMIT);
      const incoming = data.items || [];
      setComments((current) => (replace ? mergeById([], incoming) : mergeById(current, incoming)));
      setPage(data.page ?? nextPage);
      setTotalPages(data.totalPages || 0);
      setTotalItems(data.totalItems || incoming.length);
      onCountSetRef.current?.(data.totalItems || incoming.length);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [postId]);

  useEffect(() => {
    setComments([]);
    setPage(-1);
    setTotalPages(0);
    setTotalItems(initialCount || 0);
    loadPage(0, true);
  }, [postId, initialCount, loadPage]);

  const addLocalComment = (comment) => {
    setComments((current) => mergeById(current, [comment]));
    setTotalItems((current) => current + 1);
    onCountChange?.(1);
    onMutated?.();
  };

  const submitRootComment = async () => {
    const content = composerText.trim();
    if (!content || composerText.length > COMMENT_LIMIT || submittingComment) return;

    setSubmittingComment(true);
    setError('');
    try {
      const created = await feedApi.createComment(postId, content);
      addLocalComment(created);
      setComposerText('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const openReply = (comment) => {
    setReplyingToId((current) => (current === comment.id ? null : comment.id));
    setReplyText('');
  };

  const submitReply = async (commentId) => {
    const content = replyText.trim();
    if (!content || replyText.length > COMMENT_LIMIT || submittingReply) return;

    setSubmittingReply(true);
    setError('');
    try {
      const created = await feedApi.createReply(commentId, content);
      addLocalComment(created);
      setReplyText('');
      setReplyingToId(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmittingReply(false);
    }
  };

  const saveEdit = async (commentId, content) => {
    if (!content || savingEdit) return;
    setSavingEdit(true);
    setError('');
    try {
      const updated = await feedApi.updateComment(commentId, content);
      setComments((current) => current.map((item) => (item.id === commentId ? updated : item)));
      setEditingId(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setError('');
    try {
      await feedApi.deleteComment(deleteTarget.id);
      const isRoot = deleteTarget.parentCommentId == null;
      setDeleteTarget(null);

      if (isRoot) {
        await loadPage(0, true);
      } else {
        setComments((current) => removeByIdAndChildren(current, deleteTarget.id));
        setTotalItems((current) => Math.max(0, current - 1));
        onCountChange?.(-1);
        onMutated?.();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="border-t border-[#3e4042] bg-[#1c1d1e] px-4 py-3">
      <div className="mb-3 flex items-center justify-between text-sm text-[#b0b3b8]">
        <span className="font-semibold text-[#e4e6eb]">Bình luận</span>
        {totalItems > 0 && <span>{totalItems} bình luận</span>}
      </div>

      {error && <p className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

      <div className="space-y-3.5">
        {loading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl bg-[#242526] px-4 py-5 text-center text-sm text-[#b0b3b8]">
            <p className="font-semibold text-[#e4e6eb]">Chưa có bình luận nào.</p>
            <p className="mt-1">Hãy là người đầu tiên bình luận.</p>
          </div>
        ) : (
          <>
            {tree.roots.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                replies={tree.repliesByRootId.get(comment.id) || []}
                currentUser={currentUser}
                onReply={openReply}
                replyingToId={replyingToId}
                replyText={replyText}
                setReplyText={setReplyText}
                submitReply={submitReply}
                submittingReply={submittingReply}
                onEdit={setEditingId}
                editingId={editingId}
                saveEdit={saveEdit}
                savingEdit={savingEdit}
                cancelEdit={() => setEditingId(null)}
                onDelete={setDeleteTarget}
                onReport={setReportTarget}
              />
            ))}

            {tree.orphans.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-[#3e4042] bg-[#242526] p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a8d91]">Bình luận khác</p>
                {tree.orphans.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    replies={[]}
                    currentUser={currentUser}
                    onReply={openReply}
                    replyingToId={replyingToId}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    submitReply={submitReply}
                    submittingReply={submittingReply}
                    onEdit={setEditingId}
                    editingId={editingId}
                    saveEdit={saveEdit}
                    savingEdit={savingEdit}
                    cancelEdit={() => setEditingId(null)}
                    onDelete={setDeleteTarget}
                    onReport={setReportTarget}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => loadPage(page + 1)}
          disabled={loadingMore}
          className="mt-3 rounded-lg px-2 py-1 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c] hover:text-white disabled:opacity-50"
        >
          {loadingMore ? 'Đang tải...' : 'Xem thêm bình luận'}
        </button>
      )}

      <div className="mt-4 border-t border-[#3e4042]/70 pt-3">
        <CommentComposer
          currentUser={currentUser}
          value={composerText}
          onChange={setComposerText}
          submitting={submittingComment}
          onSubmit={submitRootComment}
        />
      </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          comment={deleteTarget}
          deleting={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      {reportTarget && (
        <ReportCommentModal
          comment={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
};

export default CommentSection;

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, UserPlus, MessageCircle, Heart, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../../services/api';
import Pagination from './Pagination';

const iconFor = (type) => type === 'FRIEND_REQUEST' ? UserPlus : type === 'NEW_MESSAGE' ? MessageCircle : type === 'POST_LIKE' ? Heart : MessageSquare;
const timeFor = (value) => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';

const NotificationsPanel = ({ refreshKey = 0, onUnreadChange }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([notificationApi.list(page), notificationApi.unreadCount()]);
      setItems(list.items || []);
      setTotalPages(list.totalPages || 0);
      setUnread(count.unreadCount || 0);
      onUnreadChange?.(count.unreadCount || 0);
    } catch { setNotice('Không thể tải thông báo.'); } finally { setLoading(false); }
  }, [onUnreadChange, page]);
  useEffect(() => { load(); }, [load, refreshKey, page]);

  const markRead = async (id) => { try { await notificationApi.markRead(id); await load(); } catch { setNotice('Không thể đánh dấu thông báo.'); } };
  const markAll = async () => { try { await notificationApi.markAllRead(); await load(); } catch { setNotice('Không thể đánh dấu tất cả.'); } };
  const openNotification = async (item) => {
    if (!item.read) await markRead(item.id);
    if (item.postId) navigate(`/posts/${item.postId}`);
  };

  return <section className="h-full overflow-y-auto bg-[#f7f9fc] px-5 py-6 md:px-10"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-600">Cập nhật mới</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Thông báo</h1></div><button onClick={markAll} disabled={!unread} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40"><CheckCheck size={16} /> Đọc tất cả</button></div>{notice && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{notice}</p>}{loading ? <p className="p-8 text-sm text-slate-400">Đang tải thông báo...</p> : <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">{items.length === 0 ? <div className="p-10 text-center text-sm text-slate-400"><Bell className="mx-auto mb-3" />Bạn chưa có thông báo nào.</div> : items.map((item) => { const Icon = iconFor(item.type); return <button key={item.id} onClick={() => openNotification(item)} className={`flex w-full items-start gap-3 border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${!item.read ? 'bg-amber-50/60' : ''}`}><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-100 text-amber-700">{item.actorAvatarUrl ? <img src={item.actorAvatarUrl} alt={item.actorName} className="h-full w-full object-cover" /> : <Icon size={18} />}</div><div className="min-w-0 flex-1"><p className="text-sm text-slate-700"><strong>{item.actorName}</strong> {item.message}</p><p className="mt-1 text-xs text-slate-400">{timeFor(item.createdAt)}</p></div>{!item.read && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-amber-500" />}</button>; })}<Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>}</div></section>;
};

export default NotificationsPanel;

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Check, Clock3, UserMinus, UserPlus, UserRoundX, X } from 'lucide-react';
import { friendshipApi, profileApi } from '../../services/api';
import Pagination from './Pagination';
import { useNavigate } from 'react-router-dom';

const Avatar = ({ name, src }) => <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-100 font-bold text-teal-800">{src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name?.charAt(0).toUpperCase()}</div>;
const tabs = [{ id: 'friends', label: 'Bạn bè' }, { id: 'received', label: 'Lời mời đến' }, { id: 'sent', label: 'Đã gửi' }];

const PeoplePanel = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('friends');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(0);
  const [pageInfo, setPageInfo] = useState({ totalPages: 0 });
  const [searchPage, setSearchPage] = useState(0);
  const [searchInfo, setSearchInfo] = useState({ totalPages: 0 });

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = tab === 'friends' ? await friendshipApi.getFriends(page) : tab === 'received' ? await friendshipApi.getReceivedRequests(page) : await friendshipApi.getSentRequests(page);
      setItems(data.items || []);
      setPageInfo(data);
    } catch { setNotice('Không thể tải danh sách quan hệ.'); } finally { setLoading(false); }
  }, [page, tab]);

  useEffect(() => { setPage(0); }, [tab]);
  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) { setResults([]); setSearchInfo({ totalPages: 0 }); return; }
      try { const data = await profileApi.search(query.trim(), searchPage); setResults(data.items || []); setSearchInfo(data); } catch { setResults([]); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, searchPage]);

  const refresh = () => loadList();
  const action = async (work, success) => { try { await work(); setNotice(success); refresh(); } catch (error) { setNotice(error.response?.data?.message || 'Thao tác thất bại.'); } };

  const openProfile = (userId) => navigate(`/profile/${userId}`);

  return (
    <section className="h-full overflow-y-auto bg-[#f7f9fc] px-5 py-6 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Mạng lưới của bạn</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Bạn bè & kết nối</h1></div><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-3 text-slate-400" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm người dùng..." className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 outline-none focus:border-teal-500" /></div></div>
        {results.length > 0 && <div className="mb-6 rounded-2xl border border-teal-100 bg-white p-3 shadow-sm"><p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Kết quả tìm kiếm</p>{results.map((person) => <SearchResult key={person.id} person={person} onDone={refresh} onNotice={setNotice} onOpenProfile={openProfile} />)}<Pagination page={searchPage} totalPages={searchInfo.totalPages} onChange={setSearchPage} /></div>}
        <div className="rounded-[26px] border border-slate-200 bg-white shadow-sm"><div className="flex gap-1 border-b border-slate-100 px-4 pt-3">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-t-xl px-4 py-3 text-sm font-bold ${tab === item.id ? 'border-b-2 border-teal-700 text-teal-700' : 'text-slate-400 hover:text-slate-700'}`}>{item.label}</button>)}</div><div className="p-4">{notice && <p className="mb-3 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-800">{notice}</p>}{loading ? <p className="p-6 text-sm text-slate-400">Đang tải...</p> : items.length === 0 ? <p className="p-6 text-sm text-slate-400">Chưa có dữ liệu.</p> : items.map((item) => <RelationshipItem key={item.requestId || item.userId} item={item} tab={tab} action={action} />)}<Pagination page={page} totalPages={pageInfo.totalPages} onChange={setPage} /></div></div>
      </div>
    </section>
  );
};

const SearchResult = ({ person, onDone, onNotice, onOpenProfile }) => {
  const [status, setStatus] = useState(null);
  useEffect(() => { friendshipApi.getStatus(person.id).then(setStatus).catch(() => {}); }, [person.id]);
  const run = async () => { try { if (status?.status === 'NONE') { await friendshipApi.sendRequest(person.id); onNotice('Đã gửi lời mời kết bạn.'); } else if (status?.status === 'FRIEND') { await friendshipApi.unfriend(person.id); onNotice('Đã hủy kết bạn.'); } else if (status?.status === 'PENDING_SENT') { onNotice('Lời mời đã được gửi.'); return; } setStatus(await friendshipApi.getStatus(person.id)); onDone(); } catch (error) { onNotice(error.response?.data?.message || 'Không thể cập nhật quan hệ.'); } };
  const label = status?.status === 'FRIEND' ? 'Bạn bè' : status?.status === 'PENDING_SENT' ? 'Đã gửi' : status?.status === 'PENDING_RECEIVED' ? 'Đang chờ bạn xử lý' : 'Kết bạn';
  return <div className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50"><button onClick={() => onOpenProfile(person.id)} className="shrink-0"><Avatar name={person.userName} src={person.avatarUrl} /></button><button onClick={() => onOpenProfile(person.id)} className="min-w-0 flex-1 text-left"><p className="font-bold text-slate-800">{person.userName}</p><p className="truncate text-xs text-slate-500">{person.bio || 'Chưa có giới thiệu'}</p></button><button onClick={run} disabled={status?.status === 'PENDING_RECEIVED'} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-100 disabled:text-slate-400">{status?.status === 'FRIEND' ? <UserMinus size={14} /> : <UserPlus size={14} />}{label}</button></div>;
};

const RelationshipItem = ({ item, tab, action }) => {
  const name = item.userName;
  return <div className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-slate-50"><Avatar name={name} src={item.avatarUrl} /><div className="min-w-0 flex-1"><p className="font-bold text-slate-800">{name}</p><p className="text-xs text-slate-500">{tab === 'friends' ? `Bạn bè từ ${new Date(item.friendSince).toLocaleDateString('vi-VN')}` : `Ngày ${new Date(item.createdAt).toLocaleDateString('vi-VN')}`}</p></div>{tab === 'received' && <><button onClick={() => action(() => friendshipApi.acceptRequest(item.requestId), 'Đã chấp nhận lời mời.')} className="rounded-xl bg-teal-700 p-2 text-white"><Check size={16} /></button><button onClick={() => action(() => friendshipApi.rejectRequest(item.requestId), 'Đã từ chối lời mời.')} className="rounded-xl border border-slate-200 p-2 text-slate-500"><X size={16} /></button></>}{tab === 'sent' && <button onClick={() => action(() => friendshipApi.cancelRequest(item.requestId), 'Đã hủy lời mời.')} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><Clock3 size={14} /> Hủy</button>}{tab === 'friends' && <button onClick={() => action(() => friendshipApi.unfriend(item.userId), 'Đã hủy kết bạn.')} className="rounded-xl border border-slate-200 p-2 text-slate-500"><UserRoundX size={16} /></button>}</div>;
};

export default PeoplePanel;

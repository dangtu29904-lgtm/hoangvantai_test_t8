import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Upload,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { chatApi, friendshipApi } from '../../services/api';
import useChatStore from '../../store/chatStore';

const FRIEND_PAGE_SIZE = 50;

const Avatar = ({ name, src, className = 'h-11 w-11' }) => (
  <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-teal-100 font-bold text-teal-800 ${className}`}>
    {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : (name?.charAt(0)?.toUpperCase() || '?')}
  </div>
);

const NewConversationModal = ({ onClose }) => {
  const [tab, setTab] = useState('direct');
  const [recipientId, setRecipientId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [friends, setFriends] = useState([]);
  const [friendPage, setFriendPage] = useState(0);
  const [friendInfo, setFriendInfo] = useState({ totalPages: 0 });
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendQuery, setFriendQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileInputRef = useRef(null);

  const conversations = useChatStore((state) => state.conversations);
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setActiveConversationDetail = useChatStore((state) => state.setActiveConversationDetail);

  useEffect(() => {
    if (tab !== 'group' || friends.length > 0 || friendLoading) return;
    loadFriends(0, false);
  }, [tab]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  const loadFriends = async (page = 0, append = false) => {
    setFriendLoading(true);
    try {
      const data = await friendshipApi.getFriends(page, FRIEND_PAGE_SIZE);
      const nextItems = data.items || [];
      setFriends((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setFriendInfo(data);
      setFriendPage(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách bạn bè.');
    } finally {
      setFriendLoading(false);
    }
  };

  const filteredFriends = useMemo(() => {
    const query = friendQuery.trim().toLowerCase();
    const selected = new Set(selectedMemberIds);
    return friends.filter((friend) => {
      if (selected.has(friend.userId)) return false;
      if (!query) return true;
      return [
        friend.userName,
        friend.bio,
        friend.email,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [friendQuery, friends, selectedMemberIds]);

  const selectedMembers = useMemo(() => {
    const selected = new Set(selectedMemberIds);
    return friends.filter((friend) => selected.has(friend.userId));
  }, [friends, selectedMemberIds]);

  const toggleMember = (userId) => {
    setSelectedMemberIds((prev) => (
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    ));
  };

  const handleCreateDirect = async () => {
    const id = Number.parseInt(recipientId.trim(), 10);
    if (!id || Number.isNaN(id)) {
      setError('Vui lòng nhập User ID hợp lệ.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await chatApi.createDirectConversation(id);
      const conv = {
        id: res.id,
        name: res.name || `User ${id}`,
        avatar: res.avatarUrl || null,
        unread: 0,
        type: res.type,
        isGroup: false,
        updatedAt: new Date().toISOString(),
      };

      if (!conversations.some((item) => item.id === conv.id)) {
        upsertConversation(conv);
      } else {
        upsertConversation(conv);
      }

      setActiveConversation(conv);
      setActiveConversationDetail(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo cuộc trò chuyện.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      setError('Vui lòng nhập tên nhóm.');
      return;
    }
    if (selectedMemberIds.length < 1) {
      setError('Vui lòng chọn ít nhất 1 thành viên.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const created = await chatApi.createGroupConversation(name, selectedMemberIds);
      let avatarUrl = null;
      if (avatarFile) {
        const upload = await chatApi.uploadFile(avatarFile);
        const uploadId = Number(upload?.uploadId ?? upload?.id ?? upload?.fileId);
        if (!uploadId || Number.isNaN(uploadId)) {
          throw new Error('Upload avatar khong tra ve uploadId hop le');
        }
        const avatarResponse = await chatApi.updateGroupAvatar(created.id, uploadId);
        avatarUrl = avatarResponse?.avatarUrl || null;
      }

      const detail = await chatApi.getConversationDetail(created.id);
      const normalized = {
        id: detail.id,
        name: detail.name || name,
        avatar: detail.avatarUrl || avatarUrl,
        unread: 0,
        type: detail.type || 'groups_chat',
        isGroup: true,
        updatedAt: new Date().toISOString(),
      };

      upsertConversation(normalized);
      setActiveConversation(normalized);
      setActiveConversationDetail(detail);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo nhóm.');
    } finally {
      setLoading(false);
    }
  };

  const canLoadMoreFriends = friendInfo.totalPages > friendPage + 1;
  const currentActionLoading = loading || friendLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">Tin nhắn mới</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Tạo cuộc trò chuyện</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
            <button
              onClick={() => setTab('direct')}
              className={`mb-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                tab === 'direct' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <MessageSquare size={18} />
              Chat 1-1
            </button>
            <button
              onClick={() => setTab('group')}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                tab === 'group' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Users size={18} />
              Tạo nhóm
            </button>
            <div className="mt-5 rounded-2xl bg-white p-4 text-xs text-slate-500 shadow-sm">
              <p className="font-semibold text-slate-700">Lưu ý</p>
              <p className="mt-2 leading-5">
                Tạo nhóm dùng danh sách bạn bè để chọn thành viên, rồi có thể đổi ảnh đại diện sau ngay trong phần quản lý nhóm.
              </p>
            </div>
          </aside>

          <div className="max-h-[82vh] overflow-y-auto p-5 lg:p-6">
            {tab === 'direct' ? (
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">User ID người nhận</label>
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500"
                    placeholder="VD: 5"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateDirect()}
                  />
                </div>
                <button
                  onClick={handleCreateDirect}
                  disabled={currentActionLoading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Bắt đầu trò chuyện
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar name={groupName || 'N'} src={avatarPreview} className="h-20 w-20 rounded-3xl text-2xl" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg transition hover:bg-teal-800"
                        title="Chọn ảnh nhóm"
                      >
                        <Camera size={16} />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Tên nhóm</label>
                      <input
                        type="text"
                        maxLength={100}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500"
                        placeholder="VD: Team Alpha"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                      />
                      <p className="mt-2 text-xs text-slate-400">Tối đa 100 ký tự.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Thành viên đã chọn</h3>
                      <p className="mt-1 text-xs text-slate-500">{selectedMemberIds.length} người được chọn</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIds([])}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <UserMinus size={14} />
                      Bỏ chọn hết
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedMembers.length === 0 ? (
                      <p className="text-sm text-slate-400">Chưa chọn ai cả.</p>
                    ) : selectedMembers.map((friend) => (
                      <button
                        key={friend.userId}
                        type="button"
                        onClick={() => toggleMember(friend.userId)}
                        className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-100"
                      >
                        <Avatar name={friend.userName} src={friend.avatarUrl} className="h-6 w-6 rounded-full text-[10px]" />
                        <span>{friend.userName}</span>
                        <X size={14} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-3.5 text-slate-400" size={16} />
                      <input
                        value={friendQuery}
                        onChange={(e) => setFriendQuery(e.target.value)}
                        placeholder="Tìm bạn bè để thêm vào nhóm..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto pr-1">
                    {friendLoading && friends.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        <Loader2 size={16} className="mx-auto mb-2 animate-spin" />
                        Đang tải bạn bè...
                      </div>
                    ) : filteredFriends.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-400">Không có bạn bè phù hợp.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredFriends.map((friend) => {
                          const selected = selectedMemberIds.includes(friend.userId);
                          return (
                            <button
                              key={friend.userId}
                              type="button"
                              onClick={() => toggleMember(friend.userId)}
                              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                                selected ? 'border-teal-200 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <Avatar name={friend.userName} src={friend.avatarUrl} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900">{friend.userName}</p>
                                <p className="truncate text-xs text-slate-500">{friend.bio || 'Chưa có giới thiệu'}</p>
                              </div>
                              {selected ? <Check size={18} className="text-teal-700" /> : <Plus size={18} className="text-slate-400" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {canLoadMoreFriends && (
                    <button
                      type="button"
                      onClick={() => loadFriends(friendPage + 1, true)}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      <Upload size={14} />
                      Tải thêm bạn bè
                    </button>
                  )}
                </div>

                {error && (
                  <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                )}

                <button
                  onClick={handleCreateGroup}
                  disabled={currentActionLoading || selectedMemberIds.length === 0 || !groupName.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
                  Tạo nhóm
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import useChatStore from '../../store/chatStore';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi, friendshipApi } from '../../services/api';

const Avatar = ({ name, src, className = 'h-20 w-20 rounded-full text-3xl' }) => (
  <div className={`flex items-center justify-center overflow-hidden bg-slate-200 font-semibold text-slate-700 ${className}`}>
    {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : (name?.charAt(0)?.toUpperCase() || '?')}
  </div>
);

const RightSidebar = () => {
  const activeConversation = useChatStore((state) => state.activeConversation);
  const activeConversationDetail = useChatStore((state) => state.activeConversationDetail);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setActiveConversationDetail = useChatStore((state) => state.setActiveConversationDetail);
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const removeConversation = useChatStore((state) => state.removeConversation);
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const { user } = useAuth();

  const [notice, setNotice] = useState('');
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [memberLoadingId, setMemberLoadingId] = useState(null);
  const [roleLoadingId, setRoleLoadingId] = useState(null);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [friendPage, setFriendPage] = useState(0);
  const [friendInfo, setFriendInfo] = useState({ totalPages: 0 });
  const [friendLoading, setFriendLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);

  const detail = activeConversationDetail;
  const isGroup = detail?.type === 'groups_chat';
  const conversationAvatar = detail?.avatarUrl ?? activeConversation?.avatar ?? null;
  const conversationName = detail?.name ?? activeConversation?.name ?? '';
  const members = detail?.members || [];
  const currentUserRole = detail?.currentUserRole || null;
  const selectedMemberSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filteredFriends = useMemo(() => {
    const query = addQuery.trim().toLowerCase();
    return friends.filter((friend) => {
      if (selectedMemberSet.has(friend.userId)) return false;
      if (!query) return true;
      return [friend.userName, friend.bio, friend.email].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [addQuery, friends, selectedMemberSet]);

  useEffect(() => {
    setDraftName(conversationName);
  }, [conversationName]);

  useEffect(() => {
    if (!addMembersOpen || friends.length > 0 || friendLoading) return;
    loadFriends(0, false);
  }, [addMembersOpen]);

  if (!activeConversation) return null;

  const otherMember = !isGroup && detail
    ? detail.members.find((member) => member.userId !== user?.id)
    : null;
  const isOnline = otherMember ? onlineUsers[otherMember.userId]?.status === 'online' : false;
  const statusText = isGroup ? `${members.length} thành viên` : (isOnline ? 'Đang hoạt động' : 'Offline');
  const canManageGroup = isGroup && currentUserRole === 'ADMIN';
  const canLeaveGroup = isGroup && Boolean(currentUserRole);

  async function refreshDetail() {
    const fresh = await chatApi.getConversationDetail(activeConversation.id);
    setActiveConversationDetail(fresh);
    upsertConversation({
      id: fresh.id,
      name: fresh.name,
      avatar: fresh.avatarUrl,
      unread: activeConversation.unread ?? 0,
      type: fresh.type,
      isGroup: fresh.type === 'groups_chat',
      updatedAt: activeConversation.updatedAt,
    });
    return fresh;
  }

  async function loadFriends(page = 0, append = false) {
    setFriendLoading(true);
    try {
      const data = await friendshipApi.getFriends(page, 50);
      const nextItems = data.items || [];
      setFriends((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setFriendInfo(data);
      setFriendPage(page);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể tải danh sách bạn bè.');
    } finally {
      setFriendLoading(false);
    }
  }

  const toggleMember = (userId) => {
    setSelectedIds((prev) => (
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    ));
  };

  const handleSaveName = async () => {
    if (!draftName.trim()) {
      setNotice('Tên nhóm không được để trống.');
      return;
    }

    setSavingName(true);
    try {
      await chatApi.updateGroupName(activeConversation.id, draftName.trim());
      await refreshDetail();
      setNotice('Đã cập nhật tên nhóm.');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể đổi tên nhóm.');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarPick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSavingAvatar(true);
    try {
      const upload = await chatApi.uploadFile(file);
      await chatApi.updateGroupAvatar(activeConversation.id, upload.uploadId ?? upload.id ?? upload.fileId);
      await refreshDetail();
      setNotice('Đã cập nhật ảnh nhóm.');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể cập nhật ảnh nhóm.');
    } finally {
      setSavingAvatar(false);
      event.target.value = '';
    }
  };

  const handleAddMembers = async () => {
    if (selectedIds.length === 0) {
      setNotice('Hãy chọn ít nhất 1 thành viên.');
      return;
    }

    setFriendLoading(true);
    try {
      await chatApi.addGroupMembers(activeConversation.id, selectedIds);
      await refreshDetail();
      setSelectedIds([]);
      setAddQuery('');
      setAddMembersOpen(false);
      setNotice('Đã thêm thành viên vào nhóm.');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể thêm thành viên.');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Xóa thành viên này khỏi nhóm?')) return;
    setMemberLoadingId(memberId);
    try {
      await chatApi.removeGroupMember(activeConversation.id, memberId);
      await refreshDetail();
      setNotice('Đã xóa thành viên khỏi nhóm.');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể xóa thành viên.');
    } finally {
      setMemberLoadingId(null);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    setRoleLoadingId(memberId);
    try {
      await chatApi.updateGroupMemberRole(activeConversation.id, memberId, role);
      await refreshDetail();
      setNotice('Đã cập nhật vai trò.');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể đổi vai trò.');
    } finally {
      setRoleLoadingId(null);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Bạn muốn rời nhóm này?')) return;
    try {
      await chatApi.leaveGroup(activeConversation.id);
      removeConversation(activeConversation.id);
      setActiveConversation(null);
      setActiveConversationDetail(null);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Không thể rời nhóm.');
    }
  };

  const canLoadMoreFriends = friendInfo.totalPages > friendPage + 1;

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-y-auto border-l border-gray-200 bg-white">
      <div className="flex flex-col items-center border-b border-gray-100 px-4 pb-4 pt-8">
        <div className="relative">
          <button
            type="button"
            onClick={() => canManageGroup && fileInputRef.current?.click()}
            className={`relative ${canManageGroup ? 'cursor-pointer' : 'cursor-default'}`}
            title={canManageGroup ? 'Đổi ảnh nhóm' : ''}
          >
            <Avatar name={conversationName} src={conversationAvatar} />
            {savingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-white">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}
            {isGroup && canManageGroup && (
              <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg">
                <Camera size={16} />
              </span>
            )}
          </button>
          {canManageGroup && (
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
          )}
          {!isGroup && isOnline && (
            <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">{conversationName}</h2>
          {isGroup && currentUserRole && (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
              {currentUserRole}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{statusText}</p>

        <div className="mt-5 flex space-x-4">
          <button className="flex flex-col items-center text-gray-600 transition-colors hover:text-blue-600">
            <div className="rounded-full bg-gray-100 p-2.5 hover:bg-blue-50">
              <Search size={18} />
            </div>
            <span className="mt-1 text-xs font-medium">Tìm kiếm</span>
          </button>
          {isGroup && canManageGroup && (
            <button
              onClick={() => setAddMembersOpen((value) => !value)}
              className="flex flex-col items-center text-gray-600 transition-colors hover:text-blue-600"
            >
              <div className="rounded-full bg-gray-100 p-2.5 hover:bg-blue-50">
                <Plus size={18} />
              </div>
              <span className="mt-1 text-xs font-medium">Thêm</span>
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="mx-3 mt-3 rounded-2xl bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {notice}
        </div>
      )}

      {isGroup && (
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Users size={14} /> Thành viên ({members.length})
          </h3>

          {canManageGroup && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 flex items-center gap-2">
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Tên nhóm"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                >
                  {savingName ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                  Lưu
                </button>
              </div>

              <button
                onClick={() => setAddMembersOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white"
              >
                <Plus size={14} />
                {addMembersOpen ? 'Ẩn thêm thành viên' : 'Thêm thành viên'}
              </button>

              {addMembersOpen && (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 text-slate-400" size={15} />
                      <input
                        value={addQuery}
                        onChange={(e) => setAddQuery(e.target.value)}
                        placeholder="Tìm bạn bè..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
                      />
                    </div>
                    <button
                      onClick={() => setAddMembersOpen(false)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedIds.length === 0 ? (
                      <span className="text-xs text-slate-500">Chưa chọn ai.</span>
                    ) : selectedIds.map((id) => {
                      const friend = friends.find((item) => item.userId === id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleMember(id)}
                          className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-semibold text-teal-800"
                        >
                          {friend?.userName || id}
                          <X size={12} />
                        </button>
                      );
                    })}
                  </div>

                  <div className="max-h-48 overflow-y-auto pr-1">
                    {friendLoading && friends.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <Loader2 size={14} className="mx-auto mb-2 animate-spin" />
                        Đang tải...
                      </div>
                    ) : filteredFriends.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-400">Không có bạn bè phù hợp.</p>
                    ) : filteredFriends.map((friend) => {
                      const selected = selectedMemberSet.has(friend.userId);
                      return (
                        <button
                          key={friend.userId}
                          type="button"
                          onClick={() => toggleMember(friend.userId)}
                          className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                            selected ? 'border-teal-200 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <Avatar name={friend.userName} src={friend.avatarUrl} className="h-8 w-8 rounded-full text-xs" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{friend.userName}</p>
                            <p className="truncate text-xs text-slate-500">{friend.bio || 'Chưa có giới thiệu'}</p>
                          </div>
                          {selected ? <Check size={18} className="text-teal-700" /> : <Plus size={18} className="text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleAddMembers}
                      disabled={friendLoading || selectedIds.length === 0}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {friendLoading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                      Thêm vào nhóm
                    </button>
                    {canLoadMoreFriends && (
                      <button
                        onClick={() => loadFriends(friendPage + 1, true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <ChevronDown size={14} />
                        Tải thêm
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {members.map((member) => {
              const memberOnline = onlineUsers[member.userId]?.status === 'online';
              const isMe = member.userId === user?.id;
              const canChangeMember = canManageGroup && !isMe;

              return (
                <div key={member.userId} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-gray-50">
                  <div className="relative flex-shrink-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-400 text-sm font-semibold text-white">
                      {member.userName.charAt(0).toUpperCase()}
                    </div>
                    {memberOnline && (
                      <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {member.userName} {isMe && <span className="font-normal text-gray-400">(Bạn)</span>}
                    </p>
                    <p className="text-xs text-gray-400">{member.role === 'ADMIN' ? 'Admin' : 'Thành viên'}</p>
                  </div>

                  {canChangeMember ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                        disabled={roleLoadingId === member.userId}
                        className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={memberLoadingId === member.userId || roleLoadingId === member.userId}
                        className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-white disabled:opacity-50"
                        title="Xóa thành viên"
                      >
                        {memberLoadingId === member.userId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  ) : (
                    <Shield size={14} className={memberOnline ? 'text-green-500' : 'text-gray-300'} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-2 py-2">
        {[
          { label: 'Thông tin cuộc trò chuyện' },
          { label: 'Tùy chỉnh đoạn chat' },
          { label: 'File và ảnh' },
        ].map((item) => (
          <div key={item.label} className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">{item.label}</span>
            <span className="text-gray-400 text-xs">›</span>
          </div>
        ))}
      </div>

      <div className="mt-auto border-t border-gray-100 px-2 py-4">
        {isGroup && canLeaveGroup && (
          <button
            onClick={handleLeaveGroup}
            className="mb-2 flex w-full items-center rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50"
          >
            <UserMinus size={18} className="mr-3 text-gray-500" />
            <span className="text-sm font-medium">Rời nhóm</span>
          </button>
        )}
        <button className="flex w-full items-center rounded-lg px-3 py-2 text-gray-700 transition-colors hover:bg-gray-50">
          <Pencil size={18} className="mr-3 text-gray-500" />
          <span className="text-sm font-medium">Chỉnh sửa</span>
        </button>
        <button className="flex w-full items-center rounded-lg px-3 py-2 text-red-600 transition-colors hover:bg-red-50">
          <AlertTriangle size={18} className="mr-3" />
          <span className="text-sm font-medium">Báo cáo</span>
        </button>
      </div>
    </div>
  );
};

export default RightSidebar;

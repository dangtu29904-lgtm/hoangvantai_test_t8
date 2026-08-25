import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Info,
  LogOut,
  MoreVertical,
  Pencil,
  Shield,
  UserPlus,
  Users,
  Video,
  Phone,
} from 'lucide-react';
import useChatStore from '../../store/chatStore';
import MessageBubble from '../chat/MessageBubble';
import Composer from '../chat/Composer';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi } from '../../services/api';

const PAGE_SIZE = 30;

const CenterChat = ({ markConversationAsSeen, sendMessage, editMessage, recallMessage, deleteMessageForMe, reactToMessage, setTyping, onOpenGroupSettings }) => {
  const activeConversation = useChatStore(state => state.activeConversation);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const activeConversationDetail = useChatStore(state => state.activeConversationDetail);
  const setActiveConversationDetail = useChatStore(state => state.setActiveConversationDetail);
  const setViewingConversation = useChatStore(state => state.setViewingConversation);
  const updateConversationOtherUserId = useChatStore(state => state.updateConversationOtherUserId);
  const messagesFromStore = useChatStore(state => state.messages[activeConversation?.id]);
  const typingUserId = useChatStore(state => state.typingUsers[activeConversation?.id]);
  const messages = messagesFromStore || [];
  const setMessages = useChatStore(state => state.setMessages);
  const appendMessages = useChatStore(state => state.appendMessages);
  const prependMessages = useChatStore(state => state.prependMessages);
  const onlineUsers = useChatStore(state => state.onlineUsers);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextBeforeSequence, setNextBeforeSequence] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const groupMenuRef = useRef(null);

  const otherMember = activeConversationDetail?.type === 'private_chat'
    ? activeConversationDetail.members.find(m => m.userId !== user?.id)
    : null;

  const isOnline = otherMember ? onlineUsers[otherMember.userId]?.status === 'online' : false;
  const activeStatusText = isOnline ? 'Active now' : 'Offline';
  const isGroup = activeConversationDetail?.type === 'groups_chat';
  const currentUserRole = activeConversationDetail?.currentUserRole || null;
  const isGroupAdmin = currentUserRole === 'ADMIN';

  useEffect(() => {
    if (!groupMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target)) {
        setGroupMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setGroupMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [groupMenuOpen]);

  const openGroupSettings = useCallback(() => {
    setGroupMenuOpen(false);
    onOpenGroupSettings?.();
  }, [onOpenGroupSettings]);

  const handleLeaveGroup = useCallback(async () => {
    if (!activeConversation?.id || !isGroup) return;
    if (!window.confirm('Rời khỏi nhóm này?')) return;

    try {
      await chatApi.leaveGroup(activeConversation.id);
      useChatStore.getState().removeConversation(activeConversation.id);
      setActiveConversation(null);
      setActiveConversationDetail(null);
      setViewingConversation(null);
      setGroupMenuOpen(false);
    } catch (err) {
      console.error('Failed to leave group:', err);
      window.alert(err.response?.data?.message || 'Không thể rời khỏi nhóm.');
    }
  }, [activeConversation?.id, isGroup, setActiveConversation, setActiveConversationDetail, setViewingConversation]);

  const loadMessages = useCallback(async ({ conversationId, beforeSequence = null, append = false, newerOnly = false } = {}) => {
    if (!conversationId) return;

    try {
      const data = await chatApi.getMessages(conversationId, beforeSequence, PAGE_SIZE);
      const normalized = (data.items || []).map(m => {
        const status = m.seenAt ? 'seen' : m.deliveredAt ? 'delivered' : 'sent';
        return { ...m, status };
      });

      if (append) {
        prependMessages(conversationId, normalized);
      } else {
        // When opening a conversation, the history API is authoritative.
        // Replace whatever came from /sync so the full latest history is hydrated.
        setMessages(conversationId, normalized);
      }

      setNextBeforeSequence(data.nextBeforeSequence ?? null);
      setHasMore(Boolean(data.hasMore));

      if (!newerOnly) {
        useChatStore.getState().markConversationSeen(conversationId);
        markConversationAsSeen(conversationId);
      }
    } catch (err) {
      console.error('Failed to fetch conversation messages:', err);
    }
  }, [markConversationAsSeen, prependMessages, setMessages]);

  useEffect(() => {
    if (!activeConversation) return;

    setViewingConversation(activeConversation.id);

    const fetchDetailAndMessages = async () => {
      setLoading(true);
      try {
        const detailData = await chatApi.getConversationDetail(activeConversation.id);
        setActiveConversationDetail(detailData);
        useChatStore.getState().markConversationSeen(activeConversation.id);

        const updatePresence = useChatStore.getState().updatePresence;
        await Promise.allSettled(
          (detailData.members || []).map(async (member) => {
            try {
              const presence = await chatApi.getPresence(member.userId);
              if (presence && presence.status) {
                updatePresence(member.userId, presence);
              }
            } catch (_) {}
          })
        );

        if (detailData.type === 'private_chat') {
          const otherUser = detailData.members.find(m => m.userId !== user?.id);
          if (otherUser) {
            updateConversationOtherUserId(activeConversation.id, otherUser.userId);
          }
        }

        setNextBeforeSequence(null);
        setHasMore(false);
        await loadMessages({ conversationId: activeConversation.id, beforeSequence: null, append: false });
      } catch (err) {
        console.error('Failed to fetch conversation data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailAndMessages();
    return () => setViewingConversation(null);
  }, [activeConversation?.id, user?.id, setViewingConversation]);

  const handleScroll = useCallback((event) => {
    const container = event.currentTarget;
    const isNearTop = container.scrollTop <= 120;
    const hasScrollableContent = container.scrollHeight > container.clientHeight;

    if (!isNearTop || !hasScrollableContent || loadingMore || !hasMore || nextBeforeSequence == null || !activeConversation) {
      return;
    }

    const previousScrollHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;

    setLoadingMore(true);
    loadMessages({
      conversationId: activeConversation.id,
      beforeSequence: nextBeforeSequence,
      append: true,
    }).then(() => {
      requestAnimationFrame(() => {
        if (!scrollContainerRef.current) return;
        const nextScrollHeight = scrollContainerRef.current.scrollHeight;
        scrollContainerRef.current.scrollTop = previousScrollTop + (nextScrollHeight - previousScrollHeight);
      });
    }).finally(() => setLoadingMore(false));
  }, [activeConversation, hasMore, loadingMore, loadMessages, nextBeforeSequence]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !messages.length) return;
    const shouldStickToBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (shouldStickToBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  if (!activeConversation) return null;

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden bg-white">
      <div className="z-10 flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center">
          <button
            className="mr-3 text-messenger md:hidden"
            onClick={() => setActiveConversation(null)}
          >
            <ArrowLeft size={24} />
          </button>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-200 font-medium text-gray-600">
              {activeConversation.avatar ? (
                <img src={activeConversation.avatar} alt={activeConversation.name} className="h-full w-full object-cover" />
              ) : (
                activeConversation.name.charAt(0)
              )}
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div className="ml-3">
            <h2 className="text-lg font-semibold text-gray-900">{activeConversation.name}</h2>
            <p className="text-xs text-gray-500">{isGroup ? 'Group Chat' : activeStatusText}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-messenger">
          <button className="rounded-full p-2 transition-colors hover:bg-gray-100"><Phone size={20} /></button>
          <button className="rounded-full p-2 transition-colors hover:bg-gray-100"><Video size={24} /></button>
          {isGroup ? (
            <div ref={groupMenuRef} className="relative">
              <button
                className="rounded-full p-2 transition-colors hover:bg-gray-100"
                onClick={() => setGroupMenuOpen((value) => !value)}
                aria-label="Group menu"
                aria-expanded={groupMenuOpen}
              >
                <MoreVertical size={22} />
              </button>

              {groupMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
                  <button
                    type="button"
                    onClick={openGroupSettings}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                      <Info size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">Thông tin nhóm</span>
                      <span className="block text-xs text-gray-500">Xem chi tiết, thành viên và cài đặt</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openGroupSettings}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                      <Users size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">Xem thành viên</span>
                      <span className="block text-xs text-gray-500">Mở danh sách thành viên hiện tại</span>
                    </span>
                  </button>

                  {isGroupAdmin && (
                    <>
                      <div className="my-2 border-t border-gray-100" />
                      <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                        Quản trị nhóm
                      </div>

                      <button
                        type="button"
                        onClick={openGroupSettings}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                          <Pencil size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900">Đổi tên nhóm</span>
                          <span className="block text-xs text-gray-500">Cập nhật tên hiển thị của nhóm</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={openGroupSettings}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                          <Camera size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900">Đổi ảnh đại diện</span>
                          <span className="block text-xs text-gray-500">Tải ảnh nhóm mới lên</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={openGroupSettings}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                          <UserPlus size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900">Thêm thành viên</span>
                          <span className="block text-xs text-gray-500">Mời bạn bè vào nhóm</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={openGroupSettings}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                          <Shield size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-gray-900">Quản lý thành viên</span>
                          <span className="block text-xs text-gray-500">Đổi role hoặc xóa thành viên</span>
                        </span>
                      </button>
                    </>
                  )}

                  <div className="my-2 border-t border-gray-100" />
                  <button
                    type="button"
                    onClick={handleLeaveGroup}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-red-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
                      <LogOut size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-red-600">Rời khỏi nhóm</span>
                      <span className="block text-xs text-gray-500">Rời nhóm và quay lại danh sách chat</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="hidden rounded-full p-2 transition-colors hover:bg-gray-100 lg:block"><Info size={24} /></button>
          )}
        </div>
      </div>

      <div ref={scrollContainerRef} onScroll={handleScroll} className="min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overscroll-contain bg-white px-3 py-4 md:px-6">
        {loadingMore && (
          <div className="py-2 text-center text-xs text-gray-500">Đang tải tin nhắn cũ hơn...</div>
        )}
        <div className="flex min-h-full w-full flex-col justify-end gap-0.5">
          {messages.map((msg, index) => {
            const isMine = msg.senderId === user?.id;
            const showAvatar = !isMine && (index === messages.length - 1 || messages[index + 1]?.senderId !== msg.senderId);

            return (
              <MessageBubble
                key={msg.id || msg.clientMessageId}
                message={msg}
                isMine={isMine}
                showAvatar={showAvatar}
                avatar={activeConversation.avatar || activeConversation.name.charAt(0)}
                onEdit={(message) => {
                  const content = window.prompt('Sửa tin nhắn', message.content);
                  if (content?.trim()) editMessage(message.id, content.trim());
                }}
                onRecall={recallMessage}
                onDelete={(messageId) => deleteMessageForMe(messageId)}
                onReact={reactToMessage}
                onReply={setReplyTo}
              />
            );
          })}
        </div>
      </div>

      <div className="relative z-20 flex-shrink-0 bg-white">
        {typingUserId && typingUserId !== user?.id && <div className="px-6 pb-1 text-xs text-gray-400">Đang nhập tin nhắn...</div>}
        <Composer conversationId={activeConversation.id} sendMessage={sendMessage} setTyping={setTyping} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
      </div>
    </div>
  );
};

export default CenterChat;

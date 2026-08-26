import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Maximize2, MessageCircle, MoreHorizontal, Pencil, Search, X } from 'lucide-react';
import { chatApi } from '../../services/api';
import useChatStore from '../../store/chatStore';
import { useAuth } from '../../contexts/AuthContext';
import MessageBubble from '../chat/MessageBubble';
import Composer from '../chat/Composer';

const tabs = [
  { id: 'all', label: 'Tất cả' },
  { id: 'unread', label: 'Chưa đọc' },
  { id: 'groups', label: 'Nhóm' },
  { id: 'community', label: 'Cộng đồng' },
];
const EMPTY_MESSAGES = [];

const Avatar = ({ conversation, online }) => (
  <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg font-bold text-white ${conversation.isGroup ? 'bg-violet-500' : 'bg-[#4b4b4b]'}`}>
    {conversation.avatar ? <img src={conversation.avatar} alt={conversation.name} className="h-full w-full object-cover" /> : conversation.name?.charAt(0).toUpperCase()}
    {!conversation.isGroup && online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#242526] bg-[#31a24c]" />}
  </div>
);

const HISTORY_PAGE_SIZE = 50;

const normalizeMessage = (message) => ({
  ...message,
  status: message.seenAt ? 'seen' : message.deliveredAt ? 'delivered' : 'sent'
});

async function fetchAllConversationMessages(conversationId) {
  const allMessages = [];
  let beforeSequence = null;
  let hasMore = true;
  let safety = 50;

  while (hasMore && safety-- > 0) {
    const data = await chatApi.getMessages(conversationId, beforeSequence, HISTORY_PAGE_SIZE);
    const items = data.items || [];
    allMessages.push(...items);

    hasMore = Boolean(data.hasMore);
    beforeSequence = data.nextBeforeSequence ?? null;

    if (!hasMore || beforeSequence == null) break;
  }

  return allMessages;
}

const MessengerPanel = ({ chatActions, onClose, onOpenMessenger, onNewConversation }) => {
  const conversations = useChatStore(state => state.conversations);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const setMessages = useChatStore(state => state.setMessages);
  const markConversationSeen = useChatStore(state => state.markConversationSeen);
  const setConversations = useChatStore(state => state.setConversations);
  const setViewingConversation = useChatStore(state => state.setViewingConversation);
  const updatePresence = useChatStore(state => state.updatePresence);
  const onlineUsers = useChatStore(state => state.onlineUsers);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const typingUserId = useChatStore(state => state.typingUsers[selectedConversation?.id]);
  const { isConnected, sendMessage, retryMessage, editMessage, recallMessage, deleteMessageForMe, reactToMessage, setTyping, markConversationAsSeen } = chatActions;
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationError, setConversationError] = useState('');
  const messageScrollRef = useRef(null);

  const activeConversation = useChatStore(state => state.activeConversation);
  const messages = useChatStore(state => state.messages[selectedConversation?.id] || EMPTY_MESSAGES);

  useEffect(() => () => setViewingConversation(null), [setViewingConversation]);

  useEffect(() => {
    if (!selectedConversation?.id) return;
    const latestConversation = conversations.find((conversation) => conversation.id === selectedConversation.id);
    if (latestConversation) {
      setSelectedConversation(latestConversation);
    }
  }, [conversations, selectedConversation?.id]);

  useEffect(() => {
    const loadConversations = async () => {
      setLoadingConversations(true);
      setConversationError('');
      try {
        const data = await chatApi.getConversations(null, 20);
        const normalized = (data.items || []).map((conversation) => ({
          id: conversation.id,
          name: conversation.name || `Conversation ${conversation.id}`,
          avatar: conversation.avatarUrl,
          type: conversation.type,
          isGroup: conversation.type === 'groups_chat',
          unread: conversation.unreadCount || 0,
          lastMessage: conversation.lastMessage?.content || '',
          lastMessageId: conversation.lastMessage?.id || null,
          updatedAt: conversation.updatedAt,
        }));
        const enriched = await Promise.all(normalized.map(async item => {
          if (item.isGroup) return item;
          try {
            const detail = await chatApi.getConversationDetail(item.id);
            const other = detail.members?.find(member => member.userId !== user?.id);
            return { ...item, otherUserId: other?.userId || null };
          } catch (_) {
            return item;
          }
        }));
        setConversations(enriched);
        const privateConversations = enriched.filter(item => !item.isGroup && item.otherUserId);
        await Promise.all(privateConversations.map(async item => {
          try {
            const state = await chatApi.getPresence(item.otherUserId);
            if (state) {
              updatePresence(state.userId || item.otherUserId, state);
            }
          } catch (_) {}
        }));
      } catch (error) {
        setConversationError(error.response?.data?.message || 'Không thể tải danh sách đoạn chat.');
      } finally {
        setLoadingConversations(false);
      }
    };

    loadConversations();
  }, [setConversations, updatePresence, user?.id]);

  const refreshConversationList = async () => {
    try {
      const data = await chatApi.getConversations(null, 20);
      const normalized = (data.items || []).map((conversation) => ({
        id: conversation.id,
        name: conversation.name || `Conversation ${conversation.id}`,
        avatar: conversation.avatarUrl,
        type: conversation.type,
        isGroup: conversation.type === 'groups_chat',
        unread: conversation.unreadCount || 0,
        lastMessage: conversation.lastMessage?.content || '',
        lastMessageId: conversation.lastMessage?.id || null,
        updatedAt: conversation.updatedAt,
      }));
      const enriched = await Promise.all(normalized.map(async item => {
        if (item.isGroup) return item;
        try {
          const detail = await chatApi.getConversationDetail(item.id);
          const other = detail.members?.find(member => member.userId !== user?.id);
          return { ...item, otherUserId: other?.userId || null };
        } catch (_) {
          return item;
        }
      }));
      setConversations(enriched);
    } catch (_) {}
  };

  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    const matchesSearch = conversation.name?.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === 'all'
      || (tab === 'unread' && conversation.unread > 0)
      || (tab === 'groups' && conversation.isGroup)
      || (tab === 'community' && false);
    return matchesSearch && matchesTab;
  }), [conversations, search, tab]);

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setActiveConversation(conversation);
    setViewingConversation(conversation.id);

    try {
      const hydrated = (await fetchAllConversationMessages(conversation.id)).map(normalizeMessage);
      setMessages(conversation.id, hydrated);
      markConversationSeen(conversation.id);
      await markConversationAsSeen(conversation.id);
      await refreshConversationList();
    } catch (_) {
      return;
    }
  };

  useEffect(() => {
    if (!selectedConversation?.id) return;

    const scrollToBottom = () => {
      if (!messageScrollRef.current) return;
      messageScrollRef.current.scrollTop = messageScrollRef.current.scrollHeight;
    };

    const rafId = requestAnimationFrame(scrollToBottom);
    const timeoutId = setTimeout(scrollToBottom, 80);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [selectedConversation?.id, messages.length]);

  return (
    <section className={selectedConversation ? 'pointer-events-none fixed inset-0 z-50' : 'fixed bottom-0 right-0 top-14 z-50 flex w-[min(390px,100vw)] flex-col overflow-hidden border-l border-[#3e4042] bg-[#242526] text-[#e4e6eb] shadow-2xl'}>
      {!selectedConversation && <>
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-2xl font-bold tracking-tight">Đoạn chat</h2>
        <div className="flex items-center gap-1 text-[#b0b3b8]">
          <button title="Menu" className="rounded-full p-2 hover:bg-[#3a3b3c]"><MoreHorizontal size={18} /></button>
          <button title="Mở rộng" onClick={onOpenMessenger} className="rounded-full p-2 hover:bg-[#3a3b3c]"><Maximize2 size={17} /></button>
          <button title="Tin nhắn mới" onClick={onNewConversation} className="rounded-full p-2 hover:bg-[#3a3b3c]"><Pencil size={17} /></button>
          <button title="Đóng" onClick={onClose} className="rounded-full p-2 hover:bg-[#3a3b3c]"><X size={18} /></button>
        </div>
      </header>

      <div className="px-3 pb-2">
        <label className="flex items-center rounded-full bg-[#3a3b3c] px-3 py-2.5 text-[#b0b3b8]">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm trên Messenger" className="min-w-0 flex-1 bg-transparent pl-2 text-sm outline-none placeholder:text-[#b0b3b8]" />
        </label>
      </div>

      <nav className="flex gap-1 px-3 pb-2">
        {tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-full px-3 py-2 text-xs font-bold ${tab === item.id ? 'bg-[#263951] text-[#4599ff]' : 'text-[#b0b3b8] hover:bg-[#3a3b3c]'}`}>{item.label}</button>)}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {loadingConversations ? (
          <div className="px-6 py-16 text-center text-sm text-[#b0b3b8]">Đang tải các cuộc trò chuyện...</div>
        ) : conversationError ? (
          <div className="px-6 py-16 text-center text-sm text-[#f28b82]">{conversationError}</div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-[#b0b3b8]">
            <MessageCircle size={30} className="mb-3 text-[#1877f2]" />
            <p className="text-sm font-semibold">Chưa có cuộc trò chuyện phù hợp.</p>
            <p className="mt-1 text-xs">Các cuộc trò chuyện của bạn sẽ xuất hiện ở đây.</p>
          </div>
        ) : filteredConversations.map((conversation) => (
          <button key={conversation.id} onClick={() => openConversation(conversation)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-[#3a3b3c]">
            <Avatar conversation={conversation} online={onlineUsers[conversation.otherUserId]?.status === 'online'} />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[15px]">{conversation.name}</strong>
              <span className={`mt-0.5 block truncate text-xs ${conversation.unread > 0 ? 'font-bold text-[#e4e6eb]' : 'text-[#b0b3b8]'}`}>{conversation.lastMessage || 'Mở cuộc trò chuyện'}</span>
            </span>
            {conversation.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1877f2] px-1.5 text-[11px] font-bold text-white">{conversation.unread}</span>}
          </button>
        ))}
      </div>

      <button onClick={onOpenMessenger} className="flex w-full items-center justify-center gap-2 border-t border-[#3e4042] py-3 text-sm font-bold text-[#4599ff] hover:bg-[#3a3b3c]"><MessageCircle size={16} /> Mở trong Messenger</button>
      </>}

      {selectedConversation && <div className="pointer-events-auto fixed bottom-4 right-4 z-60 flex h-[min(520px,calc(100dvh-90px))] w-[min(360px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl bg-[#242526] shadow-2xl ring-1 ring-[#3e4042]">
        <header className="flex items-center gap-2 border-b border-[#3e4042] bg-[#b000ff] px-3 py-2.5"><button onClick={() => { if (selectedConversation?.id) markConversationSeen(selectedConversation.id); setSelectedConversation(null); setActiveConversation(null); setViewingConversation(null); }} className="rounded-full p-1 text-white hover:bg-white/10"><ArrowLeft size={17} /></button><Avatar conversation={selectedConversation} online={onlineUsers[selectedConversation.otherUserId]?.status === 'online'} /><strong className="min-w-0 flex-1 truncate text-sm text-white">{selectedConversation.name}<span className={`ml-2 inline-flex items-center gap-1 text-xs font-normal ${onlineUsers[selectedConversation.otherUserId]?.status === 'online' ? 'text-emerald-200' : 'text-white/60'}`}>{onlineUsers[selectedConversation.otherUserId]?.status === 'online' && <span className="h-2 w-2 rounded-full bg-emerald-300" />}{onlineUsers[selectedConversation.otherUserId]?.status === 'online' ? 'Online' : 'Offline'}</span></strong><button onClick={onOpenMessenger} title="Mở trong Messenger" className="rounded-full p-1 text-white hover:bg-white/10"><Maximize2 size={16} /></button><button onClick={() => { if (selectedConversation?.id) markConversationSeen(selectedConversation.id); setSelectedConversation(null); setActiveConversation(null); setViewingConversation(null); }} className="rounded-full p-1 text-white hover:bg-white/10"><X size={17} /></button></header>
        <div ref={messageScrollRef} className="min-h-0 flex-1 overflow-y-auto p-2">{messages.map((message, index) => <MessageBubble key={message.id || message.clientMessageId} theme="dark" message={message} isMine={message.senderId === user?.id} showAvatar={index === messages.length - 1 || messages[index + 1]?.senderId !== message.senderId} avatar={selectedConversation.avatar || selectedConversation.name?.charAt(0)} onEdit={(item) => { const next = window.prompt('Sửa tin nhắn', item.content); if (next?.trim()) editMessage(item.id, next.trim()); }} onRecall={recallMessage} onDelete={deleteMessageForMe} onReact={reactToMessage} onReply={setReplyTo} onRetry={retryMessage} />)}</div>
        {!isConnected && <div className="bg-amber-100 px-3 py-1 text-center text-xs text-amber-800">Đang kết nối lại máy chủ chat...</div>}
        {typingUserId && typingUserId !== user?.id && <div className="bg-[#242526] px-3 pb-1 text-xs text-[#b0b3b8]"><span className="mr-1 inline-flex gap-0.5"><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b0b3b8]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b0b3b8] [animation-delay:120ms]" /><i className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b0b3b8] [animation-delay:240ms]" /></span>Đang nhập tin nhắn...</div>}
        <Composer theme="dark" conversationId={selectedConversation.id} sendMessage={sendMessage} setTyping={setTyping} replyTo={replyTo} onClearReply={() => setReplyTo(null)} />
      </div>}
    </section>
  );
};

export default MessengerPanel;

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, Video, Info, ArrowLeft } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import MessageBubble from '../chat/MessageBubble';
import Composer from '../chat/Composer';
import useChatSocket from '../../hooks/useChatSocket';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi } from '../../services/api';

const PAGE_SIZE = 30;

const CenterChat = () => {
  const activeConversation = useChatStore(state => state.activeConversation);
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const activeConversationDetail = useChatStore(state => state.activeConversationDetail);
  const setActiveConversationDetail = useChatStore(state => state.setActiveConversationDetail);
  const updateConversationOtherUserId = useChatStore(state => state.updateConversationOtherUserId);
  const messagesFromStore = useChatStore(state => state.messages[activeConversation?.id]);
  const messages = messagesFromStore || [];
  const setMessages = useChatStore(state => state.setMessages);
  const prependMessages = useChatStore(state => state.prependMessages);
  const onlineUsers = useChatStore(state => state.onlineUsers);
  const { markConversationAsSeen } = useChatSocket();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextBeforeSequence, setNextBeforeSequence] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const otherMember = activeConversationDetail?.type === 'private_chat'
    ? activeConversationDetail.members.find(m => m.userId !== user?.id)
    : null;

  const isOnline = otherMember ? onlineUsers[otherMember.userId]?.status === 'online' : false;
  const activeStatusText = isOnline ? 'Active now' : 'Offline';
  const isGroup = activeConversationDetail?.type === 'groups_chat';

  const loadMessages = useCallback(async ({ conversationId, beforeSequence = null, append = false, newerOnly = false } = {}) => {
    if (!conversationId) return;

    try {
      const data = await chatApi.getMessages(conversationId, beforeSequence, PAGE_SIZE);
      const normalized = (data.items || []).map(m => ({
        id: m.id,
        clientMessageId: m.clientMessageId,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content,
        status: 'seen',
        sentAt: m.sentAt,
        sequenceNumber: m.sequenceNumber,
      }));

      if (append) {
        prependMessages(conversationId, normalized);
      } else {
        setMessages(conversationId, normalized);
      }

      const nextCursor = data.nextBeforeSequence ?? null;
      setNextBeforeSequence(nextCursor);
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
  }, [activeConversation?.id, user?.id]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearTop = container.scrollTop <= 120;
      const hasScrollableContent = container.scrollHeight > container.clientHeight;

      if (isNearTop && hasScrollableContent && !loadingMore && hasMore && nextBeforeSequence != null) {
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
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeConversation?.id, hasMore, loadingMore, nextBeforeSequence, loadMessages]);

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
    <div className="flex flex-col h-full bg-white">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm z-10">
        <div className="flex items-center">
          <button
            className="md:hidden mr-3 text-messenger"
            onClick={() => setActiveConversation(null)}
          >
            <ArrowLeft size={24} />
          </button>
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center font-medium text-white overflow-hidden">
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

        <div className="flex items-center space-x-4 text-messenger">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Phone size={20} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Video size={24} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors hidden lg:block"><Info size={24} /></button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 bg-white flex flex-col">
        {loadingMore && (
          <div className="text-center text-xs text-gray-400 py-2">Đang tải tin nhắn cũ hơn...</div>
        )}
        <div className="mt-auto">
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
              />
            );
          })}
        </div>
      </div>

      <div className="flex-shrink-0">
        <Composer conversationId={activeConversation.id} />
      </div>
    </div>
  );
};

export default CenterChat;

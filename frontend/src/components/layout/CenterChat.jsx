import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, Video, Info, ArrowLeft } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import MessageBubble from '../chat/MessageBubble';
import Composer from '../chat/Composer';
import { useAuth } from '../../contexts/AuthContext';
import { chatApi } from '../../services/api';

const PAGE_SIZE = 30;

const CenterChat = ({ markConversationAsSeen, sendMessage, editMessage, recallMessage, deleteMessageForMe, reactToMessage, setTyping }) => {
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
      const normalized = (data.items || []).map(m => {
        // Derive status from what the backend tells us:
        // - If seenAt is set → someone has seen it → 'seen'
        // - If message belongs to us, default to 'sent' (WebSocket will push 'delivered'/'seen' updates)
        // - If message from others, no status icon needed — use 'seen' as placeholder
        let status;
        if (m.senderId === user?.id) {
          status = m.seenAt ? 'seen' : 'sent';
        } else {
          status = 'seen'; // recipient viewing history, no sender-side status needed
        }
        return { ...m, status };
      });

      if (append) {
        prependMessages(conversationId, normalized);
      } else {
        // Use appendMessages (merge) instead of setMessages (overwrite) so messages
        // already added by sync are preserved and de-duped, not erased.
        appendMessages(conversationId, normalized);
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
  }, [markConversationAsSeen, appendMessages, prependMessages, setMessages]);

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
          <button className="hidden rounded-full p-2 transition-colors hover:bg-gray-100 lg:block"><Info size={24} /></button>
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

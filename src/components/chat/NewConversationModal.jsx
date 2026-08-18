import React, { useState } from 'react';
import { X, Search, Users, MessageSquare, Check } from 'lucide-react';
import { chatApi } from '../../services/api';
import useChatStore from '../../store/chatStore';

/**
 * Modal tạo cuộc trò chuyện mới.
 * Direct chat: nhập userId của người nhận.
 * Group chat: nhập tên nhóm + danh sách userId.
 */
const NewConversationModal = ({ onClose }) => {
  const [tab, setTab] = useState('direct'); // 'direct' | 'group'
  const [recipientId, setRecipientId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberIds, setMemberIds] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setActiveConversation = useChatStore(s => s.setActiveConversation);
  const setConversations = useChatStore(s => s.setConversations);
  const conversations = useChatStore(s => s.conversations);

  const handleCreateDirect = async () => {
    const id = parseInt(recipientId.trim());
    if (!id || isNaN(id)) { setError('Vui lòng nhập User ID hợp lệ'); return; }
    setLoading(true); setError('');
    try {
      const res = await chatApi.createDirectConversation(id);
      // res: DirectConversationResponse { id, type, name, avatarUrl, created }
      const conv = {
        id: res.id,
        name: res.name || `User ${id}`,
        avatar: res.avatarUrl,
        isOnline: false,
        lastMessage: '',
        unread: 0,
        type: res.type,
        isGroup: false,
      };
      if (!conversations.find(c => c.id === res.id)) {
        setConversations([conv, ...conversations]);
      }
      setActiveConversation(conv);
      onClose();
    } catch (e) {
      setError(e.response?.data || 'Không thể tạo cuộc trò chuyện');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { setError('Vui lòng nhập tên nhóm'); return; }
    const ids = memberIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (ids.length < 1) { setError('Vui lòng nhập ít nhất 1 User ID thành viên'); return; }
    setLoading(true); setError('');
    try {
      const res = await chatApi.createGroupConversation(groupName.trim(), ids);
      const conv = {
        id: res.id,
        name: res.name,
        avatar: null,
        isOnline: false,
        lastMessage: '',
        unread: 0,
        type: 'groups_chat',
        isGroup: true,
      };
      setConversations([conv, ...conversations]);
      setActiveConversation(conv);
      onClose();
    } catch (e) {
      setError(e.response?.data || 'Không thể tạo nhóm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Cuộc trò chuyện mới</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setTab('direct')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === 'direct' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={16} /> Chat 1-1
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              tab === 'group' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={16} /> Tạo nhóm
          </button>
        </div>

        <div className="p-6 space-y-4">
          {tab === 'direct' ? (
            <>
              <p className="text-sm text-gray-500">Nhập User ID của người bạn muốn nhắn tin:</p>
              <input
                type="number"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="VD: 5"
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateDirect()}
              />
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Tên nhóm</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="VD: Team Alpha"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  User ID thành viên <span className="text-gray-400 font-normal">(cách nhau bằng dấu phẩy)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="VD: 2, 3, 4"
                  value={memberIds}
                  onChange={e => setMemberIds(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={tab === 'direct' ? handleCreateDirect : handleCreateGroup}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {loading ? 'Đang tạo...' : tab === 'direct' ? 'Bắt đầu trò chuyện' : 'Tạo nhóm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;

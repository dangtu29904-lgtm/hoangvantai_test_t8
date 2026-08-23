import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Users, Film, Store, Flag, Filter, Search, 
  UserPlus, UserCheck, MessageCircle, MoreHorizontal, ChevronDown 
} from 'lucide-react';
import Header from '../components/layout/Header';
import { profileApi, friendshipApi, chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import useChatStore from '../store/chatStore';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { setActiveConversation } = useChatStore();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState({});

  useEffect(() => {
    if (!query.trim()) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await profileApi.search(query, 0, 20);
        const resultUsers = data.items || data.content || data || [];
        setUsers(resultUsers);

        // Fetch friendship statuses for search results
        const statusMap = {};
        for (const u of resultUsers) {
          if (u.id !== currentUser?.id) {
            try {
              const st = await friendshipApi.getStatus(u.id);
              statusMap[u.id] = st;
            } catch (_) {
              statusMap[u.id] = { status: 'NONE' };
            }
          }
        }
        setFriendStatuses(statusMap);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query, currentUser]);

  const handleAddFriend = async (targetId) => {
    try {
      await friendshipApi.sendRequest(targetId);
      const updatedStatus = await friendshipApi.getStatus(targetId);
      setFriendStatuses(prev => ({ ...prev, [targetId]: updatedStatus }));
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  };

  const handleMessage = async (targetId) => {
    try {
      const conv = await chatApi.createDirectConversation(targetId);
      if (conv) {
        setActiveConversation({
          id: conv.id,
          name: conv.name,
          avatar: conv.avatar,
          type: conv.type || 'private_chat',
          otherUserId: targetId
        });
        navigate('/home');
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#18191a] text-[#e4e6eb] font-sans">
      <Header currentUser={currentUser} />

      <div className="mx-auto flex max-w-[1400px] min-h-[calc(100vh-56px)]">
        {/* Left Sidebar Filters */}
        <aside className="w-80 shrink-0 border-r border-[#3e4042] bg-[#242526] p-4 hidden md:block">
          <h1 className="text-2xl font-bold text-white mb-4">Kết quả tìm kiếm</h1>
          
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Bộ lọc</h2>
            <div className="flex items-center gap-3 rounded-lg bg-[#3a3b3c] p-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] text-white">
                <Search size={20} />
              </div>
              <span className="font-bold text-white">Tất cả</span>
            </div>

            <div className="mt-4 space-y-3 px-2 border-t border-[#3e4042] pt-4">
              <div className="flex items-center justify-between text-sm text-[#b0b3b8]">
                <span>Bài viết mới đây</span>
                <input type="checkbox" className="toggle-checkbox h-5 w-9 rounded-full bg-[#3a3b3c] accent-[#1877f2]" />
              </div>
              <div className="flex items-center justify-between text-sm text-[#b0b3b8]">
                <span>Bài viết bạn đã xem</span>
                <input type="checkbox" className="toggle-checkbox h-5 w-9 rounded-full bg-[#3a3b3c] accent-[#1877f2]" />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm font-semibold text-[#e4e6eb]">
              <div className="flex items-center justify-between py-2 border-t border-[#3e4042] cursor-pointer">
                <span>Ngày đăng</span>
                <ChevronDown size={18} className="text-[#b0b3b8]" />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-[#3e4042] cursor-pointer">
                <span>Bài viết của</span>
                <ChevronDown size={18} className="text-[#b0b3b8]" />
              </div>
              <div className="flex items-center justify-between py-2 border-t border-[#3e4042] cursor-pointer">
                <span>Vị trí được gắn thẻ</span>
                <ChevronDown size={18} className="text-[#b0b3b8]" />
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t border-[#3e4042] pt-4">
            <button className="flex w-full items-center gap-3 rounded-lg p-2.5 hover:bg-[#3a3b3c] text-sm font-semibold text-white">
              <Users size={20} className="text-[#2d88ff]" /> Mọi người
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg p-2.5 hover:bg-[#3a3b3c] text-sm font-semibold text-[#b0b3b8]">
              <Film size={20} /> Thước phim
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg p-2.5 hover:bg-[#3a3b3c] text-sm font-semibold text-[#b0b3b8]">
              <Store size={20} /> Marketplace
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg p-2.5 hover:bg-[#3a3b3c] text-sm font-semibold text-[#b0b3b8]">
              <Flag size={20} /> Trang
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 max-w-4xl">
          {loading ? (
            <div className="p-8 text-center text-[#b0b3b8]">Đang tìm kiếm...</div>
          ) : users.length === 0 ? (
            <div className="rounded-xl bg-[#242526] p-8 text-center text-[#b0b3b8]">
              Không tìm thấy kết quả phù hợp với "{query}".
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top featured result if available */}
              {users[0] && (
                <div className="rounded-xl bg-[#242526] p-4 shadow-sm border border-[#3e4042]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${users[0].id}`)}>
                      <div className="h-16 w-16 overflow-hidden rounded-full bg-[#3a3b3c]">
                        {users[0].avatarUrl ? (
                          <img src={users[0].avatarUrl} alt={users[0].userName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
                            {users[0].userName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white hover:underline">{users[0].userName}</h3>
                        <p className="text-xs text-[#b0b3b8]">{users[0].bio || 'Thành viên Socially'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {friendStatuses[users[0].id]?.status === 'FRIEND' ? (
                        <button onClick={() => handleMessage(users[0].id)} className="flex items-center gap-2 rounded-lg bg-[#2d88ff] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                          <MessageCircle size={16} /> Nhắn tin
                        </button>
                      ) : (
                        <button onClick={() => handleAddFriend(users[0].id)} className="flex items-center gap-2 rounded-lg bg-[#2d88ff] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                          <UserPlus size={16} /> Thêm bạn bè
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* People Section */}
              <div className="rounded-xl bg-[#242526] p-4 shadow-sm border border-[#3e4042]">
                <h2 className="text-xl font-bold text-white mb-4">Mọi người</h2>
                <div className="space-y-4">
                  {users.map(u => {
                    const st = friendStatuses[u.id]?.status;
                    return (
                      <div key={u.id} className="flex items-center justify-between border-b border-[#3e4042]/50 pb-4 last:border-b-0 last:pb-0">
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => navigate(`/profile/${u.id}`)}
                        >
                          <div className="h-12 w-12 overflow-hidden rounded-full bg-[#3a3b3c] shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt={u.userName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-bold text-white">
                                {u.userName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white hover:underline">{u.userName}</h4>
                            <p className="text-xs text-[#b0b3b8]">
                              {u.bio ? u.bio : 'Mọi người · Socially'}
                            </p>
                          </div>
                        </div>

                        {u.id !== currentUser?.id && (
                          <div className="flex items-center gap-2">
                            {st === 'FRIEND' ? (
                              <button onClick={() => handleMessage(u.id)} className="flex items-center gap-2 rounded-lg bg-[#3a3b3c] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#4e4f50]">
                                <MessageCircle size={16} /> Nhắn tin
                              </button>
                            ) : st === 'PENDING_SENT' ? (
                              <button disabled className="flex items-center gap-2 rounded-lg bg-[#3a3b3c] px-3 py-1.5 text-sm font-semibold text-[#b0b3b8]">
                                <UserCheck size={16} /> Đã gửi lời mời
                              </button>
                            ) : (
                              <button onClick={() => handleAddFriend(u.id)} className="flex items-center gap-2 rounded-lg bg-[#2d88ff] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#166fe5]">
                                <UserPlus size={16} /> Thêm bạn bè
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SearchResultsPage;

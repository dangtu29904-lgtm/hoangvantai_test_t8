import React, { useEffect, useState, useRef } from 'react';
import { Bell, Compass, Film, Gamepad2, Home, Menu, MessageCircle, Search, Users, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../../services/api';
import useNotificationStore from '../../store/notificationStore';

const Header = ({ 
  currentUser, 
  onToggleChat, 
  onToggleNotifications, 
}) => {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const initRealtimeNotifications = useNotificationStore(state => state.initRealtimeNotifications);

  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState([]);
  const [showLiveSearch, setShowLiveSearch] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const cleanup = initRealtimeNotifications();
    return () => {
      if (cleanup) cleanup();
    };
  }, [initRealtimeNotifications]);

  // Click outside to close live search popup
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowLiveSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = async (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim()) {
      setLoadingSearch(true);
      setShowLiveSearch(true);
      try {
        const res = await profileApi.search(value.trim(), 0, 8);
        setLiveResults(res.items || res.content || res || []);
      } catch (err) {
        console.error('Live search error:', err);
      } finally {
        setLoadingSearch(false);
      }
    } else {
      setLiveResults([]);
      setShowLiveSearch(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowLiveSearch(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const selectUser = (userId) => {
    setShowLiveSearch(false);
    setSearchQuery('');
    navigate(`/profile/${userId}`);
  };

  const goToFullSearch = () => {
    if (!searchQuery.trim()) return;
    setShowLiveSearch(false);
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#3e4042] bg-[#242526] px-3 shadow-lg lg:px-5 text-[#e4e6eb]">
      {/* Left: Logo & Search */}
      <div className="flex min-w-0 items-center gap-2 relative" ref={searchRef}>
        <button 
          onClick={() => navigate('/home')} 
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-2xl font-black text-white hover:opacity-90 transition-opacity"
          title="Trang chủ Socially"
        >
          s
        </button>
        
        <div className="relative flex items-center rounded-full bg-[#3a3b3c] px-3 py-2">
          <Search size={17} className="text-[#b0b3b8]" />
          <input 
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.trim() && setShowLiveSearch(true)}
            placeholder="Tìm kiếm trên Socially" 
            className="w-44 sm:w-56 bg-transparent pl-2 text-sm outline-none placeholder:text-[#b0b3b8] text-white" 
          />

          {/* Live Search Popup Overlay (Matching Image 2) */}
          {showLiveSearch && (
            <div className="absolute left-0 top-12 z-50 w-80 rounded-xl bg-[#242526] p-2 shadow-2xl ring-1 ring-[#3e4042]">
              <div className="max-h-80 overflow-y-auto">
                {loadingSearch ? (
                  <div className="p-4 text-center text-xs text-[#b0b3b8]">Đang tìm...</div>
                ) : liveResults.length > 0 ? (
                  liveResults.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => selectUser(user.id)}
                      className="flex items-center gap-3 rounded-lg p-2 transition cursor-pointer hover:bg-[#3a3b3c]"
                    >
                      <div className="h-9 w-9 overflow-hidden rounded-full bg-[#3a3b3c] shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.userName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold text-white text-xs">
                            {user.userName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{user.userName}</p>
                        <p className="text-xs text-[#b0b3b8]">Mọi người</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-[#b0b3b8]">Không có kết quả khớp.</div>
                )}
              </div>

              {/* Bottom option to execute full search */}
              <div 
                onClick={goToFullSearch}
                className="flex items-center gap-3 border-t border-[#3e4042] mt-1 pt-2 p-2 rounded-lg cursor-pointer hover:bg-[#3a3b3c] text-[#2d88ff] font-semibold text-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1877f2]/20 text-[#1877f2]">
                  <Search size={16} />
                </div>
                <span>Tìm kiếm "{searchQuery}"</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Main Navigation Icons */}
      <nav className="hidden items-center gap-1 md:flex">
        <button 
          onClick={() => navigate('/home')} 
          className="flex h-11 min-w-16 items-center justify-center rounded-lg px-6 text-[#b0b3b8] hover:bg-[#3a3b3c] transition-colors" 
          title="Trang chủ"
        >
          <Home size={22} />
        </button>
        <button 
          onClick={() => navigate('/friends')} 
          className="flex h-11 min-w-16 items-center justify-center rounded-lg px-6 text-[#b0b3b8] hover:bg-[#3a3b3c] transition-colors" 
          title="Bạn bè"
        >
          <Users size={22} />
        </button>
        <button 
          className="flex h-11 min-w-16 items-center justify-center rounded-lg px-6 text-[#b0b3b8] hover:bg-[#3a3b3c] transition-colors" 
          title="Watch"
        >
          <Film size={22} />
        </button>
        <button 
          className="flex h-11 min-w-16 items-center justify-center rounded-lg px-6 text-[#b0b3b8] hover:bg-[#3a3b3c] transition-colors" 
          title="Khám phá"
        >
          <Compass size={22} />
        </button>
        <button 
          className="flex h-11 min-w-16 items-center justify-center rounded-lg px-6 text-[#b0b3b8] hover:bg-[#3a3b3c] transition-colors" 
          title="Giải trí"
        >
          <Gamepad2 size={22} />
        </button>
      </nav>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-2">
        <button 
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50] transition-colors" 
          title="Menu"
        >
          <Menu size={19} />
        </button>
        <button 
          onClick={onToggleChat} 
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50] transition-colors" 
          title="Messenger"
        >
          <MessageCircle size={19} />
        </button>
        <button 
          onClick={onToggleNotifications} 
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#3a3b3c] text-[#e4e6eb] hover:bg-[#4e4f50] transition-colors" 
          title="Thông báo"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#fa3e3e] px-1 text-[11px] font-bold text-white shadow-md">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => navigate('/profile')} 
          className="rounded-full ring-2 ring-transparent hover:ring-[#1877f2] transition-all" 
          title="Trang cá nhân"
        >
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#3a3b3c] font-bold text-white">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              currentUser?.userName?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;

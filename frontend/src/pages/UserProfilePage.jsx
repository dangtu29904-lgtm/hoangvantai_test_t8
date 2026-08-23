import React, { useCallback, useEffect, useState, useRef } from 'react';
import { 
  BarChart2, Bell, Briefcase, Calendar, Camera, Check, ChevronDown, 
  Edit3, Film, Filter, Globe, GraduationCap, Grid, Heart, Home, 
  Image as ImageIcon, List, MapPin, MessageCircle, MoreHorizontal, 
  Pencil, Plus, Search, Send, Settings, SlidersHorizontal, Sparkles, 
  ThumbsUp, UserCheck, UserMinus, UserPlus, UserX, Video, X 
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { chatApi, feedApi, friendshipApi, notificationApi, profileApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import useChatStore from '../store/chatStore';
import MessengerPanel from '../components/dashboard/MessengerPanel';
import NotificationPopup from '../components/dashboard/NotificationPopup';
import useChatSocket from '../hooks/useChatSocket';
import Header from '../components/layout/Header';
import PostCard from '../components/social/PostCard';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80';

const UserProfilePage = () => {
  const { userId: paramUserId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const setActiveConversation = useChatStore(state => state.setActiveConversation);
  const chatActions = useChatSocket();

  const targetUserId = paramUserId ? Number(paramUserId) : currentUser?.id;
  const isOwnProfile = !paramUserId || Number(paramUserId) === currentUser?.id;

  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState({ items: [], page: 0, totalPages: 0, totalItems: 0 });
  const [userPosts, setUserPosts] = useState([]);
  const [status, setStatus] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'about', 'reels', 'photos', 'friends'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  
  const [popup, setPopup] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Composer Modal State
  const [showComposer, setShowComposer] = useState(false);

  const coverInputRef = useRef(null);

  const loadFriends = useCallback(async (page = 0) => {
    if (!targetUserId) return;
    try {
      const data = await friendshipApi.getUserFriends(targetUserId, page);
      setFriends(data || { items: [], page: 0, totalPages: 0, totalItems: 0 });
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  }, [targetUserId]);

  const loadUserPosts = useCallback(async (page = 0) => {
    if (!targetUserId) return;
    try {
      const data = await feedApi.getUserPosts(targetUserId, page);
      setUserPosts(data?.items || []);
    } catch (err) {
      console.error('Failed to load user posts:', err);
    }
  }, [targetUserId]);

  useEffect(() => {
    const loadData = async () => {
      if (!targetUserId) return;
      setLoading(true);
      try {
        if (isOwnProfile) {
          const profileData = await profileApi.getMe();
          setProfile(profileData);
          setEditBio(profileData.bio || '');
          setEditAvatarUrl(profileData.avatarUrl || '');
          setEditCoverUrl(profileData.coverUrl || '');
          setStatus({ status: 'SELF' });
        } else {
          const [profileData, statusData] = await Promise.all([
            profileApi.getById(targetUserId),
            friendshipApi.getStatus(targetUserId),
          ]);
          setProfile(profileData);
          setStatus(statusData);
        }
        await Promise.all([loadFriends(), loadUserPosts()]);
      } catch (error) {
        console.error('Profile fetch error:', error);
        setNotice('Không thể tải thông tin hồ sơ.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
    notificationApi.unreadCount().then(data => setUnreadNotifications(data.unreadCount || 0)).catch(() => {});
  }, [targetUserId, isOwnProfile, loadFriends, loadUserPosts]);

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await chatApi.uploadFile(file);
      const newCoverUrl = uploaded.url || uploaded.secureUrl;
      setEditCoverUrl(newCoverUrl);
      if (isOwnProfile) {
        await profileApi.updateMe({ coverUrl: newCoverUrl });
        setProfile(prev => ({ ...prev, coverUrl: newCoverUrl }));
      }
    } catch (err) {
      alert('Tải ảnh bìa thất bại!');
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await profileApi.updateMe({
        bio: editBio,
        avatarUrl: editAvatarUrl,
        coverUrl: editCoverUrl,
      });
      setProfile(updated);
      setShowEditModal(false);
    } catch (err) {
      alert('Cập nhật thông tin thất bại: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      await friendshipApi.sendRequest(targetUserId);
      setStatus(await friendshipApi.getStatus(targetUserId));
      setNotice('Đã gửi lời mời kết bạn.');
    } catch (err) {
      setNotice('Không thể gửi lời mời.');
    }
  };

  const handleCancelRequest = async () => {
    try {
      if (status?.friendshipId) {
        await friendshipApi.cancelRequest(status.friendshipId);
        setStatus(await friendshipApi.getStatus(targetUserId));
        setNotice('Đã hủy lời mời kết bạn.');
      }
    } catch (err) {
      setNotice('Không thể hủy lời mời.');
    }
  };

  const handleAcceptRequest = async () => {
    try {
      if (status?.friendshipId) {
        await friendshipApi.acceptRequest(status.friendshipId);
        setStatus(await friendshipApi.getStatus(targetUserId));
        loadFriends();
        setNotice('Đã chấp nhận lời mời kết bạn.');
      }
    } catch (err) {
      setNotice('Không thể chấp nhận lời mời.');
    }
  };

  const handleRejectRequest = async () => {
    try {
      if (status?.friendshipId) {
        await friendshipApi.rejectRequest(status.friendshipId);
        setStatus(await friendshipApi.getStatus(targetUserId));
        setNotice('Đã từ chối lời mời.');
      }
    } catch (err) {
      setNotice('Không thể từ chối.');
    }
  };

  const handleUnfriend = async () => {
    try {
      await friendshipApi.unfriend(targetUserId);
      setStatus(await friendshipApi.getStatus(targetUserId));
      loadFriends();
      setNotice('Đã hủy kết bạn.');
    } catch (err) {
      setNotice('Không thể hủy kết bạn.');
    }
  };

  const openDirectChat = async () => {
    try {
      const conversation = await chatApi.createDirectConversation(targetUserId);
      setActiveConversation({
        id: conversation.id,
        name: profile?.userName || 'Người dùng',
        avatar: profile?.avatarUrl || '',
        type: conversation.type || 'private_chat',
        isGroup: false,
        otherUserId: targetUserId,
        unread: 0,
        lastMessage: '',
        updatedAt: conversation.createdAt || new Date().toISOString(),
      });
      navigate('/home');
    } catch (error) {
      console.error(error);
      setNotice('Không thể mở cuộc trò chuyện.');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#18191a] text-sm text-[#b0b3b8]">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1877f2] border-t-transparent"></div>
          Đang tải trang cá nhân...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#18191a] text-sm text-rose-500 gap-4">
        <p>{notice || 'Không tìm thấy người dùng này.'}</p>
        <button onClick={() => navigate('/home')} className="rounded-lg bg-[#3a3b3c] px-4 py-2 text-white">Trở về Trang chủ</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#18191a] text-[#e4e6eb] font-sans">
      {/* Shared App Header */}
      <Header 
        currentUser={currentUser} 
        onToggleChat={() => setPopup(popup === 'chat' ? null : 'chat')} 
        onToggleNotifications={() => setPopup(popup === 'notifications' ? null : 'notifications')} 
        unreadNotifications={unreadNotifications} 
      />

      {/* Profile Banner & Intro Section */}
      <div className="w-full bg-[#242526] border-b border-[#3e4042] shadow-sm">
        <div className="mx-auto max-w-[1095px]">
          {/* Cover Image Banner */}
          <div className="relative h-64 sm:h-80 md:h-[350px] w-full overflow-hidden rounded-b-2xl bg-gradient-to-r from-gray-800 to-slate-900">
            <img 
              src={profile.coverUrl || DEFAULT_COVER} 
              alt="Cover" 
              className="h-full w-full object-cover"
            />
            {isOwnProfile && (
              <>
                <input 
                  type="file" 
                  ref={coverInputRef} 
                  onChange={handleCoverUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button 
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-[#3a3b3c]/90 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-[#4e4f50]"
                >
                  <Camera size={18} />
                  <span>Chỉnh sửa ảnh bìa</span>
                </button>
              </>
            )}
          </div>

          {/* Profile Header Bar (Avatar, Info & Action Buttons) */}
          <div className="px-4 pb-4 md:px-8">
            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-4 -mt-16 md:-mt-8 mb-4">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-5 text-center md:text-left">
                {/* Avatar with thought bubble */}
                <div className="relative shrink-0">
                  <div className="absolute -top-7 left-0 right-0 mx-auto w-max max-w-[180px] rounded-2xl bg-[#3a3b3c] px-3 py-1 text-xs font-medium text-gray-200 shadow-md border border-[#4e4f50]">
                    Chia sẻ suy nghĩ...
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#3a3b3c]" />
                  </div>

                  <div className="h-40 w-40 md:h-44 md:w-44 overflow-hidden rounded-full border-4 border-[#242526] bg-[#3a3b3c] shadow-2xl">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.userName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                        {profile.userName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {isOwnProfile && (
                    <button 
                      onClick={() => setShowEditModal(true)}
                      className="absolute bottom-2 right-2 rounded-full bg-[#3a3b3c] p-2.5 text-white hover:bg-[#4e4f50] border-2 border-[#242526]"
                      title="Đổi ảnh đại diện"
                    >
                      <Camera size={18} />
                    </button>
                  )}
                </div>

                {/* User Name & Stats */}
                <div className="pb-1">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-[#e4e6eb]">{profile.userName}</h1>
                  <p className="mt-1 text-sm font-semibold text-[#b0b3b8]">
                    1,4K người theo dõi • {friends.totalItems || 0} đang theo dõi
                  </p>

                  <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs font-medium text-[#b0b3b8]">
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={14} />
                      {profile.bio || 'Người sáng tạo nội dung số'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      Diễn Châu
                    </span>
                    <span className="flex items-center gap-1.5">
                      <GraduationCap size={14} />
                      THPT DIỄN CHÂU 3
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 shrink-0">
                {isOwnProfile ? (
                  <>
                    <button className="flex items-center gap-2 rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                      <BarChart2 size={16} />
                      <span>Bảng điều khiển</span>
                    </button>
                    <button 
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-2 rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm font-bold text-white hover:bg-[#4e4f50]"
                    >
                      <Pencil size={16} />
                      <span>Chỉnh sửa</span>
                    </button>
                    <button className="rounded-lg bg-[#3a3b3c] p-2.5 text-white hover:bg-[#4e4f50]">
                      <ChevronDown size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    {status?.status === 'FRIEND' && (
                      <>
                        <button onClick={handleUnfriend} className="flex items-center gap-2 rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm font-bold text-white hover:bg-[#4e4f50]">
                          <UserCheck size={16} />
                          <span>Bạn bè</span>
                        </button>
                        <button onClick={openDirectChat} className="flex items-center gap-2 rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                          <MessageCircle size={16} />
                          <span>Nhắn tin</span>
                        </button>
                      </>
                    )}

                    {status?.status === 'PENDING_SENT' && (
                      <>
                        <button onClick={handleCancelRequest} className="flex items-center gap-2 rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm font-bold text-white hover:bg-[#4e4f50]">
                          <UserCheck size={16} />
                          <span>Đã gửi lời mời</span>
                        </button>
                        <button onClick={openDirectChat} className="flex items-center gap-2 rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                          <MessageCircle size={16} />
                          <span>Nhắn tin</span>
                        </button>
                      </>
                    )}

                    {status?.status === 'PENDING_RECEIVED' && (
                      <>
                        <button onClick={handleAcceptRequest} className="flex items-center gap-2 rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                          <UserPlus size={16} />
                          <span>Chấp nhận</span>
                        </button>
                        <button onClick={handleRejectRequest} className="flex items-center gap-2 rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm font-bold text-white hover:bg-[#4e4f50]">
                          <UserX size={16} />
                          <span>Từ chối</span>
                        </button>
                        <button onClick={openDirectChat} className="flex items-center gap-2 rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                          <MessageCircle size={16} />
                          <span>Nhắn tin</span>
                        </button>
                      </>
                    )}

                    {(status?.status === 'NONE' || !status?.status) && (
                      <>
                        <button onClick={handleSendRequest} className="flex items-center gap-2 rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white hover:bg-[#166fe5]">
                          <UserPlus size={16} />
                          <span>Thêm bạn bè</span>
                        </button>
                        <button onClick={openDirectChat} className="flex items-center gap-2 rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm font-bold text-white hover:bg-[#4e4f50]">
                          <MessageCircle size={16} />
                          <span>Nhắn tin</span>
                        </button>
                      </>
                    )}

                    <button className="rounded-lg bg-[#3a3b3c] p-2.5 text-white hover:bg-[#4e4f50]">
                      <ChevronDown size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="mt-4 flex items-center justify-between border-t border-[#3e4042] pt-1">
              <div className="flex items-center space-x-1 overflow-x-auto">
                {[
                  ['all', 'Tất cả'],
                  ['about', 'Giới thiệu'],
                  ['reels', 'Reels'],
                  ['photos', 'Ảnh'],
                  ['friends', 'Bạn bè'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                      activeTab === key
                        ? 'border-b-4 border-[#1877f2] text-[#1877f2]'
                        : 'text-[#b0b3b8] hover:bg-[#3a3b3c]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button className="flex items-center gap-1 rounded-lg px-4 py-3 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c]">
                  <span>Xem thêm</span>
                  <ChevronDown size={14} />
                </button>
              </div>

              <button className="rounded-lg bg-[#3a3b3c] p-2.5 text-[#e4e6eb] hover:bg-[#4e4f50] shrink-0">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Layout (3:7 Grid Ratio: Left 30% / Right 70%) */}
      <main className="mx-auto max-w-[1095px] px-3 py-4">
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
            
            {/* PART 3 (30% Left Column): Personal Info, Work, Education, Stories, Friends & Photos */}
            <div className="space-y-4">
              
              {/* 1. Thông tin cá nhân */}
              <div className="rounded-xl bg-[#242526] p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#e4e6eb]">Thông tin cá nhân</h2>
                  {isOwnProfile && (
                    <button onClick={() => setShowEditModal(true)} className="rounded-full p-1.5 hover:bg-[#3a3b3c] text-[#b0b3b8]">
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
                <div className="space-y-3 text-sm text-[#e4e6eb]">
                  <div className="flex items-center gap-3">
                    <MapPin size={20} className="text-[#b0b3b8]" />
                    <span>Sống ở <strong>Diễn Châu</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Home size={20} className="text-[#b0b3b8]" />
                    <span>Từ <strong>Diễn Châu</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-[#b0b3b8]" />
                    <span>1 tháng 11, 2004</span>
                  </div>
                  <button onClick={() => setActiveTab('about')} className="text-xs font-semibold text-[#b0b3b8] hover:underline pt-1 block">
                    Xem thêm thông tin cá nhân
                  </button>
                </div>
              </div>

              {/* 2. Công việc */}
              <div className="rounded-xl bg-[#242526] p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#e4e6eb]">Công việc</h2>
                  {isOwnProfile && (
                    <button onClick={() => setShowEditModal(true)} className="rounded-full p-1.5 hover:bg-[#3a3b3c] text-[#b0b3b8]">
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-[#e4e6eb]">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#e4e6eb]">THPT DIỄN CHÂU 3</h4>
                    <p className="text-xs text-[#b0b3b8]">11 tháng 9, 2019 - Hiện tại · 6 năm, 11 tháng</p>
                  </div>
                </div>
              </div>

              {/* 3. Giáo dục */}
              <div className="rounded-xl bg-[#242526] p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#e4e6eb]">Giáo dục</h2>
                  {isOwnProfile && (
                    <button onClick={() => setShowEditModal(true)} className="rounded-full p-1.5 hover:bg-[#3a3b3c] text-[#b0b3b8]">
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#3a3b3c] text-[#e4e6eb]">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#e4e6eb]">Học Viện Kĩ Thuật Mật Mã</h4>
                  </div>
                </div>
                <button onClick={() => setActiveTab('about')} className="text-xs font-semibold text-[#b0b3b8] hover:underline mt-3 block">
                  Xem thêm học vấn
                </button>
              </div>

              {/* 4. Tin nổi bật */}
              <div className="rounded-xl bg-[#242526] p-4 shadow-sm">
                <h2 className="text-xl font-bold text-[#e4e6eb] mb-3">Tin nổi bật</h2>
                <button className="w-full rounded-lg bg-[#3a3b3c] py-2 text-sm font-bold text-[#e4e6eb] hover:bg-[#4e4f50] transition-colors">
                  Thêm tin nổi bật
                </button>
              </div>

              {/* 5. Bạn bè */}
              <div className="rounded-xl bg-[#242526] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h2 className="text-xl font-bold text-[#e4e6eb]">Bạn bè</h2>
                    <p className="text-xs text-[#b0b3b8]">1.395 người bạn</p>
                  </div>
                  <button onClick={() => setActiveTab('friends')} className="text-sm font-semibold text-[#2d88ff] hover:bg-[#3a3b3c] px-2 py-1 rounded">
                    Xem tất cả bạn bè
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mt-3">
                  {(friends.items?.length > 0 ? friends.items : [
                    { userId: 101, userName: 'Ha Anh Quan', mutual: '55 bạn chung' },
                    { userId: 102, userName: 'Kiên Lê', mutual: '57 bạn chung' },
                    { userId: 103, userName: 'Hoàng Thị Kiều Trinh', mutual: '11 bạn chung' },
                  ]).slice(0, 6).map((friend, idx) => (
                    <div key={friend.userId || idx} onClick={() => friend.userId && navigate(`/profile/${friend.userId}`)} className="cursor-pointer group">
                      <div className="h-24 w-full overflow-hidden rounded-xl bg-[#3a3b3c]">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt={friend.userName} className="h-full w-full object-cover group-hover:scale-105 transition" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-bold text-white text-lg">
                            {friend.userName?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-bold text-[#e4e6eb] truncate">{friend.userName}</p>
                      <p className="text-[10px] text-[#b0b3b8] truncate">{friend.mutual || 'Bạn chung'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Ảnh */}
              <div className="rounded-xl bg-[#242526] p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-[#e4e6eb]">Ảnh</h2>
                  <button onClick={() => setActiveTab('photos')} className="text-sm font-semibold text-[#2d88ff] hover:bg-[#3a3b3c] px-2 py-1 rounded">
                    Xem tất cả ảnh
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-lg">
                  {userPosts.flatMap(p => p.images || []).slice(0, 9).map((imgUrl, idx) => (
                    <img key={idx} src={imgUrl} alt="User upload" className="h-24 w-full object-cover hover:opacity-90 transition cursor-pointer" />
                  ))}
                  {userPosts.flatMap(p => p.images || []).length === 0 && (
                    <p className="col-span-3 py-6 text-center text-xs text-[#b0b3b8]">Chưa có hình ảnh nào.</p>
                  )}
                </div>
              </div>

              {/* Footer text */}
              <div className="px-2 text-[11px] text-[#b0b3b8] space-x-1 leading-relaxed">
                <span>Quyền riêng tư</span> · <span>Điều khoản</span> · <span>Quảng cáo</span> · <span>Lựa chọn quảng cáo</span> · <span>Cookie</span> · <span>Xem thêm</span>
              </div>
            </div>

            {/* PART 7 (70% Right Column): Post Composer, Filters & Feed */}
            <div className="space-y-4">
              
              {/* 1. Post Composer Box */}
              {isOwnProfile && (
                <div className="rounded-xl bg-[#242526] p-3 shadow-sm">
                  <div className="flex items-center gap-3 pb-3 border-b border-[#3e4042]">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#3a3b3c] font-bold text-white flex items-center justify-center">
                      {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile.userName?.charAt(0).toUpperCase()}
                    </div>
                    <button 
                      onClick={() => setShowComposer(true)} 
                      className="flex-1 rounded-full bg-[#3a3b3c] px-4 py-2.5 text-left text-sm text-[#b0b3b8] hover:bg-[#4e4f50] transition-colors"
                    >
                      {profile.userName} ơi, bạn đang nghĩ gì?
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-2">
                    <button onClick={() => setShowComposer(true)} className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c]">
                      <Video size={20} className="text-[#f3425f]" />
                      <span className="hidden sm:inline">Video trực tiếp</span>
                    </button>
                    <button onClick={() => setShowComposer(true)} className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c]">
                      <ImageIcon size={20} className="text-[#45bd62]" />
                      <span className="hidden sm:inline">Ảnh/video</span>
                    </button>
                    <button onClick={() => setShowComposer(true)} className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-[#b0b3b8] hover:bg-[#3a3b3c]">
                      <Film size={20} className="text-[#e41e3f]" />
                      <span className="hidden sm:inline">Thước phim</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Bài viết Header Controls */}
              <div className="rounded-xl bg-[#242526] p-3 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-[#e4e6eb]">Bài viết</h3>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 rounded-lg bg-[#3a3b3c] px-3 py-1.5 text-xs font-bold text-[#e4e6eb] hover:bg-[#4e4f50]">
                      <SlidersHorizontal size={14} />
                      <span>Bộ lọc</span>
                    </button>
                    <button className="flex items-center gap-1.5 rounded-lg bg-[#3a3b3c] px-3 py-1.5 text-xs font-bold text-[#e4e6eb] hover:bg-[#4e4f50]">
                      <Settings size={14} />
                      <span>Quản lý bài viết</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-[#3e4042] pt-2 grid grid-cols-2">
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`flex items-center justify-center gap-2 py-2 text-sm font-bold transition-colors ${
                      viewMode === 'list'
                        ? 'border-b-2 border-[#1877f2] text-[#1877f2]'
                        : 'text-[#b0b3b8] hover:bg-[#3a3b3c]'
                    }`}
                  >
                    <List size={18} />
                    <span>Chế độ xem danh sách</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center justify-center gap-2 py-2 text-sm font-bold transition-colors ${
                      viewMode === 'grid'
                        ? 'border-b-2 border-[#1877f2] text-[#1877f2]'
                        : 'text-[#b0b3b8] hover:bg-[#3a3b3c]'
                    }`}
                  >
                    <Grid size={18} />
                    <span>Chế độ xem lưới</span>
                  </button>
                </div>
              </div>

              {/* 3. Post Feed Items */}
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                {(userPosts || []).map(post => post && (
                  <PostCard key={post.id} post={post} currentUser={currentUser} onReload={loadUserPosts} />
                ))}

                {(!userPosts || userPosts.length === 0) && (
                  <div className="rounded-xl bg-[#242526] p-12 text-center text-sm text-[#b0b3b8]">
                    Chưa có bài viết nào.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab: Giới thiệu */}
        {activeTab === 'about' && (
          <div className="rounded-xl bg-[#242526] p-6 shadow-sm max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-[#e4e6eb]">Tổng quan cá nhân</h2>
            <div className="divide-y divide-[#3e4042] text-sm text-[#e4e6eb]">
              <div className="py-3 flex justify-between">
                <span className="text-[#b0b3b8]">Họ tên:</span>
                <span className="font-semibold">{profile.userName}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-[#b0b3b8]">Email:</span>
                <span className="font-semibold">{profile.email || 'Chưa cập nhật'}</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-[#b0b3b8]">Quê quán / Nơi sống:</span>
                <span className="font-semibold">Diễn Châu, Việt Nam</span>
              </div>
              <div className="py-3 flex justify-between">
                <span className="text-[#b0b3b8]">Học vấn:</span>
                <span className="font-semibold">Học Viện Kĩ Thuật Mật Mã / THPT DIỄN CHÂU 3</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Bạn bè */}
        {activeTab === 'friends' && (
          <div className="rounded-xl bg-[#242526] p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#e4e6eb] mb-4">Danh sách bạn bè ({friends.totalItems || 0})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(friends.items || []).map((friend) => (
                <div key={friend.userId} className="flex items-center justify-between rounded-xl bg-[#3a3b3c]/50 p-3 hover:bg-[#3a3b3c]">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/profile/${friend.userId}`)}>
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-[#3a3b3c] font-bold text-white flex items-center justify-center">
                      {friend.avatarUrl ? <img src={friend.avatarUrl} alt={friend.userName} className="h-full w-full object-cover" /> : friend.userName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-[#e4e6eb]">{friend.userName}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/profile/${friend.userId}`)} className="rounded-lg bg-[#3a3b3c] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#4e4f50]">
                    Xem trang cá nhân
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl bg-[#242526] shadow-2xl text-[#e4e6eb]">
            <div className="flex items-center justify-between border-b border-[#3e4042] px-5 py-4">
              <h2 className="text-xl font-bold">Chỉnh sửa trang cá nhân</h2>
              <button onClick={() => setShowEditModal(false)} className="rounded-full bg-[#3a3b3c] p-2 text-[#b0b3b8] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#b0b3b8] uppercase mb-1">Ảnh đại diện (URL)</label>
                <input 
                  type="text" 
                  value={editAvatarUrl} 
                  onChange={e => setEditAvatarUrl(e.target.value)} 
                  placeholder="https://..."
                  className="w-full rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-[#1877f2]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#b0b3b8] uppercase mb-1">Ảnh bìa (URL)</label>
                <input 
                  type="text" 
                  value={editCoverUrl} 
                  onChange={e => setEditCoverUrl(e.target.value)} 
                  placeholder="https://..."
                  className="w-full rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-[#1877f2]" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#b0b3b8] uppercase mb-1">Tiểu sử</label>
                <textarea 
                  rows={3} 
                  value={editBio} 
                  onChange={e => setEditBio(e.target.value)} 
                  placeholder="Mô tả ngắn về bạn..."
                  className="w-full rounded-lg bg-[#3a3b3c] px-3 py-2 text-sm outline-none text-white focus:ring-2 focus:ring-[#1877f2] resize-none" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#3e4042] px-5 py-3">
              <button onClick={() => setShowEditModal(false)} className="rounded-lg bg-[#3a3b3c] px-4 py-2 text-sm font-bold text-white hover:bg-[#4e4f50]">
                Hủy
              </button>
              <button onClick={handleSaveProfile} disabled={savingProfile} className="rounded-lg bg-[#1877f2] px-5 py-2 text-sm font-bold text-white hover:bg-[#166fe5] disabled:opacity-50">
                {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {popup === 'chat' && <MessengerPanel chatActions={chatActions} onClose={() => setPopup(null)} onOpenMessenger={() => navigate('/chat')} />}
      {popup === 'notifications' && <NotificationPopup onClose={() => setPopup(null)} />}
    </div>
  );
};

export default UserProfilePage;

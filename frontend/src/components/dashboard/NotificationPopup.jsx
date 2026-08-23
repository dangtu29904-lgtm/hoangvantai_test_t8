import React, { useEffect } from 'react';
import { X, Bell, Check } from 'lucide-react';
import useNotificationStore from '../../store/notificationStore';

const Avatar = ({ name = 'U', src }) => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 font-bold text-white">
    {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
  </div>
);

const NotificationPopup = ({ onClose }) => {
  const { 
    notifications, 
    loading, 
    fetchNotifications, 
    markAllAsRead, 
    markItemAsRead 
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(0, 10);
  }, [fetchNotifications]);

  return (
    <div className="fixed right-4 top-16 z-50 w-[360px] overflow-hidden rounded-xl bg-[#242526] shadow-2xl ring-1 ring-[#3e4042] text-[#e4e6eb]">
      <div className="flex items-center justify-between border-b border-[#3e4042] px-4 py-3">
        <h2 className="text-xl font-bold">Thông báo</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            className="rounded-full p-1.5 text-xs font-semibold text-[#2d88ff] hover:bg-[#3a3b3c] flex items-center gap-1"
            title="Đánh dấu tất cả đã đọc"
          >
            <Check size={16} />
            <span className="hidden sm:inline">Đọc tất cả</span>
          </button>
          <button onClick={onClose} className="rounded-full p-1 text-[#b0b3b8] hover:bg-[#3a3b3c]">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-sm text-[#b0b3b8]">Đang tải thông báo...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#b0b3b8]">
            <Bell className="mx-auto mb-2 opacity-50" size={28} />
            Bạn chưa có thông báo nào.
          </div>
        ) : (
          notifications.map(item => (
            <div 
              key={item.id} 
              onClick={() => !item.read && markItemAsRead(item.id)}
              className={`flex items-start gap-3 p-3 transition cursor-pointer hover:bg-[#3a3b3c] ${
                !item.read ? 'bg-[#263951]/70' : ''
              }`}
            >
              <Avatar name={item.actorName} src={item.actorAvatarUrl} />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  <strong className="font-bold">{item.actorName}</strong> {item.message}
                </p>
                <small className="text-xs text-[#b0b3b8]">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''}
                </small>
              </div>
              {!item.read && <span className="mt-2 h-2.5 w-2.5 rounded-full bg-[#1877f2] shrink-0" />}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[#3e4042] p-2 text-center">
        <button onClick={onClose} className="w-full py-1.5 text-sm font-bold text-[#2d88ff] hover:bg-[#3a3b3c] rounded-lg">
          Đóng
        </button>
      </div>
    </div>
  );
};

export default NotificationPopup;

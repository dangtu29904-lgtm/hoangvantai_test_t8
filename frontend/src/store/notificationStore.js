import { create } from 'zustand';
import { notificationApi } from '../services/api';
import { wsService } from '../services/websocket/stompClient';

const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  notifications: [],
  loading: false,
  isListening: false,

  fetchUnreadCount: async () => {
    try {
      const data = await notificationApi.unreadCount();
      set({ unreadCount: data.unreadCount || 0 });
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  },

  fetchNotifications: async (page = 0, limit = 10) => {
    set({ loading: true });
    try {
      const data = await notificationApi.list(page, limit);
      set({ notifications: data.items || [], loading: false });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({ loading: false });
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationApi.markAllRead();
      set(state => ({
        unreadCount: 0,
        notifications: state.notifications.map(item => ({ ...item, read: true })),
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  markItemAsRead: async (id) => {
    try {
      await notificationApi.markRead(id);
      set(state => ({
        unreadCount: Math.max(0, state.unreadCount - 1),
        notifications: state.notifications.map(item => 
          item.id === id ? { ...item, read: true } : item
        ),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  initRealtimeNotifications: () => {
    if (get().isListening) return;

    // Fetch initial count
    get().fetchUnreadCount();

    const handleNewNotification = (newNotif) => {
      console.log('Realtime notification received via STOMP:', newNotif);
      set(state => ({
        unreadCount: state.unreadCount + 1,
        notifications: [newNotif, ...state.notifications],
      }));
    };

    wsService.subscribe('/user/queue/notifications', handleNewNotification);
    set({ isListening: true });

    return () => {
      wsService.unsubscribe('/user/queue/notifications', handleNewNotification);
      set({ isListening: false });
    };
  },
}));

export default useNotificationStore;

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080', // Backend does not use /api prefix
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const chatApi = {
  getConversations: async (cursor, limit = 20) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', limit);
    const response = await api.get(`/user/conversations?${params.toString()}`);
    return response.data;
  },
  getMessages: async (conversationId, beforeSequence, limit = 30) => {
    const params = new URLSearchParams();
    if (beforeSequence) params.append('beforeSequence', beforeSequence);
    if (limit) params.append('limit', limit);
    const response = await api.get(`/user/conversations/${conversationId}/messages?${params.toString()}`);
    return response.data;
  },
  createDirectConversation: async (recipientId) => {
    const response = await api.post('/user/conversations/direct', { recipientId });
    return response.data;
  },
  createGroupConversation: async (name, memberIds) => {
    const response = await api.post('/user/conversations/group', { name, memberIds });
    return response.data;
  },
  getConversationDetail: async (conversationId) => {
    const response = await api.get(`/user/conversations/${conversationId}`);
    return response.data;
  },
  getPresence: async (userId) => {
    const response = await api.get(`/presence/${userId}`);
    return response.data;
  },
  syncMessages: async (afterMessageId, limit = 100) => {
    const params = new URLSearchParams();
    if (afterMessageId) params.append('afterMessageId', afterMessageId);
    if (limit) params.append('limit', limit);
    const response = await api.get(`/user/chat/sync?${params.toString()}`);
    return response.data;
  },
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post('/user/chat/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  }
};

export const profileApi = {
  getMe: async () => (await api.get('/user/profile/me')).data,
  getById: async (userId) => (await api.get(`/user/profile/${userId}`)).data,
  search: async (q, page = 0, limit = 20) =>
    (await api.get('/user/profile/search', { params: { q, page, limit } })).data,
  updateMe: async (payload) => (await api.put('/user/profile/me', payload)).data,
};

export const friendshipApi = {
  getFriends: async (page = 0, limit = 20) =>
    (await api.get('/user/friends', { params: { page, limit } })).data,
  getUserFriends: async (userId, page = 0, limit = 20) =>
    (await api.get(`/user/friends/${userId}/friends`, { params: { page, limit } })).data,
  getReceivedRequests: async (page = 0, limit = 20) =>
    (await api.get('/user/friends/requests/received', { params: { page, limit } })).data,
  getSentRequests: async (page = 0, limit = 20) =>
    (await api.get('/user/friends/requests/sent', { params: { page, limit } })).data,
  getStatus: async (userId) => (await api.get(`/user/friends/status/${userId}`)).data,
  sendRequest: async (receiverId) => (await api.post(`/user/friends/requests/${receiverId}`)).data,
  acceptRequest: async (requestId) => (await api.post(`/user/friends/requests/${requestId}/accept`)).data,
  rejectRequest: async (requestId) => (await api.post(`/user/friends/requests/${requestId}/reject`)).data,
  cancelRequest: async (requestId) => (await api.delete(`/user/friends/requests/${requestId}`)).data,
  unfriend: async (friendId) => (await api.delete(`/user/friends/${friendId}`)).data,
};

export const notificationApi = {
  list: async (page = 0, limit = 20) =>
    (await api.get('/user/notifications', { params: { page, limit } })).data,
  unreadCount: async () => (await api.get('/user/notifications/unread-count')).data,
  markRead: async (notificationId) =>
    (await api.patch(`/user/notifications/${notificationId}/read`)).data,
  markAllRead: async () => (await api.patch('/user/notifications/read-all')).data,
};

export const feedApi = {
  getFeed: async (page = 0, limit = 20) =>
    (await api.get('/user/feed', { params: { page, limit } })).data,
  getUserPosts: async (userId, page = 0, limit = 20) =>
    (await api.get(`/user/posts/user/${userId}`, { params: { page, limit } })).data,
  getPost: async (postId) => (await api.get(`/user/posts/${postId}`)).data,
  createPost: async (payload) => (await api.post('/user/posts', payload)).data,
  updatePost: async (postId, payload) => (await api.put(`/user/posts/${postId}`, payload)).data,
  deletePost: async (postId) => (await api.delete(`/user/posts/${postId}`)).data,
  react: async (postId, type) => (await api.post(`/user/feed/${postId}/reactions`, { type })).data,
  removeReaction: async (postId) => (await api.delete(`/user/feed/${postId}/reactions`)).data,
  getReactions: async (postId, page = 0, limit = 20) =>
    (await api.get(`/user/feed/${postId}/reactions`, { params: { page, limit } })).data,
  getComments: async (postId, page = 0, limit = 20) =>
    (await api.get(`/user/posts/${postId}/comments`, { params: { page, limit } })).data,
  createComment: async (postId, content) =>
    (await api.post(`/user/posts/${postId}/comments`, { content })).data,
  updateComment: async (commentId, content) =>
    (await api.put(`/user/posts/comments/${commentId}`, { content })).data,
  deleteComment: async (commentId) => (await api.delete(`/user/posts/comments/${commentId}`)).data,
  createReply: async (commentId, content) =>
    (await api.post(`/user/posts/comments/${commentId}/replies`, { content })).data,
};

export default api;

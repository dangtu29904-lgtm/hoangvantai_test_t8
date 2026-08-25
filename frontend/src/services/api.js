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
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
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
  addGroupMembers: async (conversationId, memberIds) => {
    const response = await api.post(`/user/conversations/${conversationId}/members`, { memberIds });
    return response.data;
  },
  removeGroupMember: async (conversationId, memberId) => {
    const response = await api.delete(`/user/conversations/${conversationId}/members/${memberId}`);
    return response.data;
  },
  leaveGroup: async (conversationId) => {
    const response = await api.delete(`/user/conversations/${conversationId}/members/me`);
    return response.data;
  },
  updateGroupName: async (conversationId, name) => {
    const response = await api.patch(`/user/conversations/${conversationId}/name`, { name });
    return response.data;
  },
  updateGroupMemberRole: async (conversationId, memberId, role) => {
    const response = await api.patch(`/user/conversations/${conversationId}/members/${memberId}/role`, { role });
    return response.data;
  },
  updateGroupAvatar: async (conversationId, uploadId) => {
    const response = await api.patch(`/user/conversations/${conversationId}/avatar`, { uploadId });
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
    return (await api.post('/user/chat/uploads', formData)).data;
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
  savePost: async (postId) => (await api.post(`/user/posts/${postId}/save`)).data,
  unsavePost: async (postId) => (await api.delete(`/user/posts/${postId}/save`)).data,
  getSavedPosts: async (page = 0, limit = 20) =>
    (await api.get('/user/posts/saved', { params: { page, limit } })).data,
  hidePost: async (postId) => (await api.post(`/user/posts/${postId}/hide`)).data,
  unhidePost: async (postId) => (await api.delete(`/user/posts/${postId}/hide`)).data,
  sharePost: async (postId, payload) => (await api.post(`/user/posts/${postId}/share`, payload)).data,
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
  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post('/user/chat/uploads', formData)).data;
  },
};

export const storyApi = {
  createStory: async (payload) => (await api.post('/user/stories', payload)).data,
  getFeed: async () => (await api.get('/user/stories/feed')).data,
  getMyStories: async () => (await api.get('/user/stories/me')).data,
  getStory: async (storyId) => (await api.get(`/user/stories/${storyId}`)).data,
  deleteStory: async (storyId) => (await api.delete(`/user/stories/${storyId}`)).data,
  viewStory: async (storyId) => (await api.post(`/user/stories/${storyId}/view`)).data,
  getViewers: async (storyId, page = 0, limit = 50) =>
    (await api.get(`/user/stories/${storyId}/viewers`, { params: { page, limit } })).data,
  react: async (storyId, type) =>
    (await api.post(`/user/stories/${storyId}/reaction`, { type })).data,
  removeReaction: async (storyId) => (await api.delete(`/user/stories/${storyId}/reaction`)).data,
  reply: async (storyId, clientMessageId, content) =>
    (await api.post(`/user/stories/${storyId}/reply`, { clientMessageId, content })).data,
};

export const musicApi = {
  getTracks: async (page = 0, limit = 20, config = {}) =>
    (await api.get('/user/music/tracks', { ...config, params: { page, limit } })).data,
  searchTracks: async (q, page = 0, limit = 20, config = {}) =>
    (await api.get('/user/music/tracks/search', { ...config, params: { q, page, limit } })).data,
  getTrack: async (trackId, config = {}) => (await api.get(`/user/music/tracks/${trackId}`, config)).data,
};

export const reportApi = {
  reportPost: async (postId, payload) =>
    (await api.post(`/user/reports/posts/${postId}`, payload)).data,
  reportComment: async (commentId, payload) =>
    (await api.post(`/user/reports/comments/${commentId}`, payload)).data,
  reportUser: async (userId, payload) =>
    (await api.post(`/user/reports/users/${userId}`, payload)).data,
  getMyReports: async (page = 0, limit = 20) =>
    (await api.get('/user/reports', { params: { page, limit } })).data,
};

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

export const adminApi = {
  getOverview: async () => (await api.get('/admin/statistics/overview')).data,
  getGrowth: async (metric, period = 'SEVEN_DAYS') =>
    (await api.get('/admin/statistics/growth', { params: { metric, period } })).data,
  getTopPosts: async (period = 'SEVEN_DAYS', limit = 10) =>
    (await api.get('/admin/statistics/top-posts', { params: { period, limit } })).data,
  getActiveUsers: async (period = 'SEVEN_DAYS', limit = 10) =>
    (await api.get('/admin/statistics/active-users', { params: { period, limit } })).data,
  getReportStatistics: async () => (await api.get('/admin/statistics/reports')).data,
  getStoryStatistics: async () => (await api.get('/admin/statistics/stories')).data,
  getChatStatistics: async () => (await api.get('/admin/statistics/chat')).data,
  getReports: async ({ status, targetType, reason, page = 0, limit = 20 } = {}) =>
    (await api.get('/admin/reports', { params: cleanParams({ status, targetType, reason, page, limit }) })).data,
  getReport: async (reportId) => (await api.get(`/admin/reports/${reportId}`)).data,
  startReview: async (reportId) => (await api.patch(`/admin/reports/${reportId}/review`)).data,
  resolveReport: async (reportId, resolutionNote = '') =>
    (await api.patch(`/admin/reports/${reportId}/resolve`, { resolutionNote })).data,
  rejectReport: async (reportId, resolutionNote = '') =>
    (await api.patch(`/admin/reports/${reportId}/reject`, { resolutionNote })).data,
  removePost: async (postId) => (await api.delete(`/admin/posts/${postId}`)).data,
  removeComment: async (commentId) => (await api.delete(`/admin/comments/${commentId}`)).data,
  suspendUser: async (userId, reason = '') =>
    (await api.patch(`/admin/users/${userId}/suspend`, { reason })).data,
  unsuspendUser: async (userId) => (await api.patch(`/admin/users/${userId}/unsuspend`)).data,
};

export default api;

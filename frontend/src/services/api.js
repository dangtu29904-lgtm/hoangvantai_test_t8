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
  }
};

export default api;

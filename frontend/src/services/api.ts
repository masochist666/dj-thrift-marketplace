import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (email: string, password: string, display_name: string) =>
    api.post('/auth/register', { email, password, display_name }),
  
  getCurrentUser: () =>
    api.get('/auth/me'),
  
  updateProfile: (data: any) =>
    api.patch('/auth/me/profile', data),
  
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/me/change-password', { current_password, new_password }),
  
  logout: () =>
    api.post('/auth/logout'),
};

export const tracksAPI = {
  getTracks: (params?: any) =>
    api.get('/tracks', { params }),
  
  getTrack: (id: string) =>
    api.get(`/tracks/${id}`),
  
  createTrack: (data: any) =>
    api.post('/tracks', data),
  
  updateTrack: (id: string, data: any) =>
    api.patch(`/tracks/${id}`, data),
  
  deleteTrack: (id: string) =>
    api.delete(`/tracks/${id}`),
  
  publishTrack: (id: string) =>
    api.post(`/tracks/${id}/publish`),
  
  initUpload: (trackId: string, data: any) =>
    api.post(`/tracks/${trackId}/upload-init`, data),
  
  completeUpload: (trackId: string, data: any) =>
    api.post(`/tracks/${trackId}/upload-complete`, data),
  
  getDownloadUrl: (trackId: string, fileId: string) =>
    api.get(`/tracks/${trackId}/download/${fileId}`),
  
  getUserTracks: (userId: string, params?: any) =>
    api.get(`/tracks/user/${userId}`, { params }),
};

export const tradesAPI = {
  getTrades: (params?: any) =>
    api.get('/trades', { params }),
  
  getTrade: (id: string) =>
    api.get(`/trades/${id}`),
  
  createTrade: (data: any) =>
    api.post('/trades', data),
  
  respondToTrade: (id: string, data: any) =>
    api.post(`/trades/${id}/respond`, data),
  
  cancelTrade: (id: string) =>
    api.post(`/trades/${id}/cancel`),
  
  getTradeStats: () =>
    api.get('/trades/stats/overview'),
  
  getTradeHistory: (userId: string, params?: any) =>
    api.get(`/trades/history/${userId}`, { params }),
  
  getPendingTrades: () =>
    api.get('/trades/pending/incoming'),
  
  getOutgoingTrades: () =>
    api.get('/trades/pending/outgoing'),
};

export const paymentsAPI = {
  createPurchase: (data: any) =>
    api.post('/payments/purchase', data),
  
  getPurchases: () =>
    api.get('/payments/purchases'),
  
  getSales: () =>
    api.get('/payments/sales'),
  
  getCredits: () =>
    api.get('/payments/credits'),
  
  addCredits: (data: any) =>
    api.post('/payments/credits/add', data),
  
  transferCredits: (data: any) =>
    api.post('/payments/credits/transfer', data),
};

export const groupsAPI = {
  getGroups: () =>
    api.get('/groups'),
  
  getGroup: (id: string) =>
    api.get(`/groups/${id}`),
  
  createGroup: (data: any) =>
    api.post('/groups', data),
  
  joinGroup: (id: string) =>
    api.post(`/groups/${id}/join`),
  
  leaveGroup: (id: string) =>
    api.post(`/groups/${id}/leave`),
  
  sendMessage: (id: string, data: any) =>
    api.post(`/groups/${id}/messages`, data),
  
  getMessages: (id: string, params?: any) =>
    api.get(`/groups/${id}/messages`, { params }),
  
  inviteUser: (id: string, data: any) =>
    api.post(`/groups/${id}/invite`, data),
};

export const adminAPI = {
  getStats: () =>
    api.get('/admin/stats'),
  
  getFlaggedContent: () =>
    api.get('/admin/flagged'),
  
  moderateContent: (data: any) =>
    api.post('/admin/moderate', data),
  
  getUsers: (params?: any) =>
    api.get('/admin/users', { params }),
  
  updateUserRole: (userId: string, data: any) =>
    api.patch(`/admin/users/${userId}/role`, data),
  
  getAuditLogs: (params?: any) =>
    api.get('/admin/audit-logs', { params }),
};

export default api;

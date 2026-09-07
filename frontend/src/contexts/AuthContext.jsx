import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { authApi } from '../services/api';

const AuthContext = createContext();
const DEVICE_ID_KEY = 'socially.deviceId';
const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';
const USER_SESSION_ID_KEY = 'userSessionId';
const AUTH_UPDATED_EVENT = 'auth:updated';
const AUTH_LOGOUT_EVENT = 'auth:logout';
const PENDING_LOGIN_STATUSES = new Set([
  'PENDING_APPROVAL',
  'PENDING_APPROVAL_OR_OTP',
  'PENDING_OTP'
]);

const createDeviceId = () => (
  globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`
);

const getOrCreateDeviceId = () => {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;

  const next = createDeviceId();
  localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
};

const detectBrowser = () => {
  const userAgent = navigator.userAgent;
  if (/Edg\//i.test(userAgent)) return 'Edge';
  if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) return 'Chrome';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return 'Safari';
  return 'Unknown';
};

const detectOs = () => {
  const platform = navigator.userAgentData?.platform || navigator.platform || navigator.userAgent;
  if (/Win/i.test(platform)) return 'Windows';
  if (/Mac/i.test(platform)) return 'macOS';
  if (/Android/i.test(platform)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'iOS';
  if (/Linux/i.test(platform)) return 'Linux';
  return 'Unknown';
};

const getDeviceType = () => (
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
);

const buildLoginDeviceInfo = () => {
  const browser = detectBrowser();
  const os = detectOs();
  return {
    deviceId: getOrCreateDeviceId(),
    deviceName: `${browser} on ${os}`,
    deviceType: getDeviceType(),
    browser,
    os
  };
};

const buildUserData = (data = {}) => ({
  id: data.userId,
  userName: data.userName,
  email: data.email,
  avatarUrl: data.avatarUrl,
  coverUrl: data.coverUrl,
  role: data.role
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    const handleAuthUpdated = (event) => {
      const nextToken = event.detail?.token || localStorage.getItem(TOKEN_KEY);
      const nextUser = event.detail?.user || JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      setToken(nextToken);
      setUser(nextUser);
    };

    const handleAuthLogout = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener(AUTH_UPDATED_EVENT, handleAuthUpdated);
    window.addEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout);
    setLoading(false);

    return () => {
      window.removeEventListener(AUTH_UPDATED_EVENT, handleAuthUpdated);
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleAuthLogout);
    };
  }, []);

  const login = async (email, password) => {
    // TODO BACKEND: adjust endpoint according to AuthController
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        ...buildLoginDeviceInfo()
      });
      const data = response.data;

      if (PENDING_LOGIN_STATUSES.has(data.loginStatus)) {
        return {
          success: false,
          pendingApproval: true,
          loginStatus: data.loginStatus,
          approvalToken: data.approvalToken,
          riskScore: data.riskScore,
          expiresAt: data.approvalExpiresAt,
        };
      }
      
      persistAuth(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const sendLoginOtp = async (approvalToken) => {
    try {
      const data = await authApi.sendLoginOtp(approvalToken);
      return {
        success: true,
        message: data.message,
        expiresAt: data.expiresAt,
        debugOtp: data.debugOtp,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data || 'Khong the gui OTP',
      };
    }
  };

  const verifyLoginOtp = async (approvalToken, otp, trustDevice = false) => {
    try {
      const data = await authApi.verifyLoginOtp(approvalToken, { otp, trustDevice });
      if (data.status === 'APPROVED' && data.auth?.token) {
        persistAuth(data.auth);
        return { success: true, status: data.status };
      }

      return {
        success: false,
        status: data.status,
        error: 'OTP da duoc xac minh nhung server khong tra ve token',
      };
    } catch (error) {
      return {
        success: false,
        status: 'ERROR',
        error: error.response?.data?.message || error.response?.data || 'OTP khong hop le',
      };
    }
  };

  const checkLoginApproval = async (approvalToken) => {
    try {
      const data = await authApi.getLoginApprovalStatus(approvalToken);

      if (data.status === 'APPROVED' && data.auth?.token) {
        persistAuth(data.auth);
        return { success: true, status: data.status };
      }

      return {
        success: false,
        status: data.status,
        riskScore: data.riskScore,
        expiresAt: data.expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        status: 'ERROR',
        error: error.response?.data?.message || 'Khong the kiem tra trang thai duyet dang nhap',
      };
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.warn('Logout revoke session failed:', error);
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_SESSION_ID_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const updateUser = (patch) => {
    setUser((current) => {
      const next = { ...(current || {}), ...(patch || {}) };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const persistAuth = (data) => {
    const userData = buildUserData(data);

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    if (data.userSessionId) localStorage.setItem(USER_SESSION_ID_KEY, String(data.userSessionId));

    setToken(data.token);
    setUser(userData);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      updateUser,
      checkLoginApproval,
      sendLoginOtp,
      verifyLoginOtp,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

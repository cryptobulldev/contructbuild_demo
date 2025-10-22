import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { User, AuthState, LoginCredentials, RegisterCredentials, AuthResponse, RefreshResponse } from '../types/auth';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  refreshToken as apiRefreshToken,
} from "../api";


interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
  });

  useEffect(() => {
    // Load auth state from localStorage on mount
    const loadAuthState = () => {
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem('accessToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (storedUser && storedAccessToken && storedRefreshToken) {
        setState({
          user: JSON.parse(storedUser),
          accessToken: storedAccessToken,
          refreshToken: storedRefreshToken,
          isLoading: false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuthState();
  }, []);

  useEffect(() => {
    // Set up token refresh interval
    if (state.refreshToken) {
      const intervalId = setInterval(refreshToken, TOKEN_REFRESH_INTERVAL);
      return () => clearInterval(intervalId);
    }
  }, [state.refreshToken]);

  const updateAuthState = (data: AuthResponse) => {
    setState({
      user: data.user,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      isLoading: false,
    });

    // Store in localStorage
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response: AuthResponse = await apiLogin(credentials);
      updateAuthState(response);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      const response: AuthResponse = await apiRegister(credentials);
      updateAuthState(response);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const refreshToken = async () => {
    if (!state.refreshToken) return;

    try {
      const response: RefreshResponse = await apiRefreshToken(state.refreshToken);
      setState(prev => ({
        ...prev,
        accessToken: response.access_token,
      }));

      localStorage.setItem('accessToken', response.access_token);
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, log out the user
      await logout();
    }
  };

  const logout = async () => {
    try {
      if (state.accessToken) {
        await apiLogout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state and localStorage regardless of logout API success
      setState({
        user: null,
        accessToken: null,
        refreshToken: null,
        isLoading: false,
      });

      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    isAuthenticated: !!state.accessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthGuard = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return { isLoading };
};

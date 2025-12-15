'use client';

import { useState, useEffect } from 'react';
import { authAPI } from '@/lib/api/client';
import type { UserRole } from '@/packages/shared';

export interface UserRoleState {
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
}

export function useUserRole() {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    loadUserRole();
  }, []);

  async function loadUserRole() {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      const profile = await authAPI.getMe();
      setState({
        role: profile.role as UserRole,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // If 401, user is not authenticated - that's ok, role is null
      // Silently handle 401 errors without logging
      if (error?.status === 401) {
        setState({
          role: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Only log non-401 errors in development
      if (process.env.NODE_ENV === 'development' && error?.status !== 401) {
        console.error('Error loading user role:', {
          status: error?.status,
          message: error?.message,
          error: error,
        });
      }
      
      setState({
        role: null,
        isLoading: false,
        error: error?.status === 401 ? null : (error?.message || 'Failed to load user role'),
      });
    }
  }

  const isCuratorOrAdmin = state.role === 'curator' || state.role === 'admin';

  return {
    ...state,
    isCuratorOrAdmin,
    refetch: loadUserRole,
  };
}


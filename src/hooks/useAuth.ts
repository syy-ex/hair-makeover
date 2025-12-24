'use client';

import { useCallback, useEffect, useState } from 'react';

export type AuthUser = {
  id: string;
  email: string;
  pointsBalance: number;
  isAdmin: boolean;
};

export type RechargeOrder = {
  id: string;
  amount: number;
  points: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  note?: string;
};

type AuthResponse = {
  user: AuthUser | null;
};

type RechargeResponse = {
  order: RechargeOrder;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return '请求失败';
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      '请求失败';
    throw new Error(message);
  }

  return data as T;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchJson<AuthResponse>('/api/auth/me');
      setUser(data.user);
    } catch (err) {
      setUser(null);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const requestCode = useCallback(async (email: string) => {
    await fetchJson('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }, []);

  const register = useCallback(async (email: string, code: string, password: string) => {
    const data = await fetchJson<AuthResponse>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });
    setUser(data.user);
    setError(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await fetchJson<AuthResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    await fetchJson('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setError(null);
  }, []);

  const recharge = useCallback(async (amount: number) => {
    const data = await fetchJson<RechargeResponse>('/api/recharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    setError(null);
    return data.order;
  }, []);

  const getRechargeOrder = useCallback(async (orderId: string) => {
    const data = await fetchJson<RechargeResponse>(`/api/recharge/${orderId}`);
    setError(null);
    return data.order;
  }, []);

  return {
    user,
    isLoading,
    error,
    refreshUser,
    requestCode,
    register,
    login,
    logout,
    recharge,
    getRechargeOrder,
  };
}

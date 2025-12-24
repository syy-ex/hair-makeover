'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

type RechargeOrder = {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  points: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  note?: string;
};

const statusLabels: Record<RechargeOrder['status'], string> = {
  pending: '待确认',
  approved: '已确认',
  rejected: '已拒绝',
};

export default function AdminRechargePage() {
  const { user, isLoading: authLoading, error: authError, login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>(
    'pending'
  );
  const [orders, setOrders] = useState<RechargeOrder[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canManage = Boolean(user?.isAdmin);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      await login(email, password);
      setPassword('');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '登录失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const fetchOrders = async () => {
    if (!canManage) {
      setMessage('无权限');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const query = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
      const response = await fetch(`/api/admin/recharge${query}`, {
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error || '加载失败';
        setMessage(errorMessage);
        setOrders([]);
        return;
      }
      setOrders(data.orders || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const reviewOrder = async (orderId: string, action: 'approve' | 'reject') => {
    if (!canManage) {
      setMessage('无权限');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ orderId, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = data?.error || '操作失败';
        setMessage(errorMessage);
        return;
      }
      await fetchOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOrders([]);
  }, [statusFilter, user?.id]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">充值人工审核</h1>
          {user && (
            <Button variant="outline" onClick={logout}>
              退出登录
            </Button>
          )}
        </div>
        <p className="text-sm text-[#7C7C7C]">管理员账号登录后可审核充值订单。</p>
      </div>

      {authLoading ? (
        <p className="text-sm text-[#7C7C7C]">正在加载账号信息...</p>
      ) : !user ? (
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-3 rounded-lg border border-[#D0D4D4] bg-white p-4"
        >
          <label className="text-sm font-medium">管理员邮箱</label>
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="管理员邮箱"
            className="rounded-md border border-[#D0D4D4] px-3 py-2 text-sm outline-none focus:border-black"
          />
          <label className="text-sm font-medium">密码</label>
          <input
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            placeholder="密码"
            className="rounded-md border border-[#D0D4D4] px-3 py-2 text-sm outline-none focus:border-black"
          />
          <Button type="submit" disabled={authBusy}>
            {authBusy ? '登录中...' : '登录'}
          </Button>
          {(authMessage || authError) && (
            <p className="text-xs text-[#7C7C7C]">{authMessage || authError}</p>
          )}
        </form>
      ) : !canManage ? (
        <div className="rounded-lg border border-[#D0D4D4] bg-white p-4">
          <p className="text-sm text-[#7C7C7C]">当前账号无管理员权限。</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-[#D0D4D4] bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium">订单状态</label>
              <select
                value={statusFilter}
                onChange={event =>
                  setStatusFilter(event.target.value as 'pending' | 'approved' | 'rejected' | 'all')
                }
                className="rounded-md border border-[#D0D4D4] px-3 py-2 text-sm"
              >
                <option value="pending">待确认</option>
                <option value="approved">已确认</option>
                <option value="rejected">已拒绝</option>
                <option value="all">全部</option>
              </select>
              <Button onClick={fetchOrders} disabled={loading}>
                {loading ? '加载中...' : '加载订单'}
              </Button>
            </div>
            {message && <p className="text-xs text-[#7C7C7C]">{message}</p>}
          </div>

          <div className="rounded-lg border border-[#D0D4D4] bg-white p-4">
            {orders.length === 0 ? (
              <p className="text-sm text-[#7C7C7C]">暂无订单</p>
            ) : (
              <div className="grid gap-3">
                {orders.map(order => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-2 rounded-md border border-[#E4E5E6] p-3"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>订单号：{order.id}</span>
                      <span>状态：{statusLabels[order.status]}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-[#7C7C7C]">
                      <span>用户：{order.userEmail}</span>
                      <span>金额：{order.amount} 元</span>
                      <span>积分：{order.points}</span>
                      <span>创建时间：{new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    {order.reviewedAt && (
                      <p className="text-xs text-[#7C7C7C]">
                        审核时间：{new Date(order.reviewedAt).toLocaleString()}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => reviewOrder(order.id, 'approve')}
                        disabled={loading || order.status !== 'pending'}
                      >
                        确认到账
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => reviewOrder(order.id, 'reject')}
                        disabled={loading || order.status !== 'pending'}
                      >
                        拒绝
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { HairstyleSelector } from '@/components/demo/HairstyleSelector';
import { ImagePicker } from '@/components/demo/ImagePicker';
import { ImagePreview } from '@/components/demo/ImagePreview';
import { LoadingState } from '@/components/demo/LoadingState';
import { ResultView } from '@/components/demo/ResultView';
import { useTextToImageContext } from '@/contexts/TextToImageContext';
import { useAuth } from '@/hooks/useAuth';
import type { RechargeOrder } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '../ui/button';

const hairstyles = [
  {
    imageUrl: '/images/hairstyles/1.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/2.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/3.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/4.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/5.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/6.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/7.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/8.jpeg',
    prompt: '',
  },
  {
    imageUrl: '/images/hairstyles/9.jpeg',
    prompt: '',
  },
];

const rechargeStatusLabels: Record<RechargeOrder['status'], string> = {
  pending: '待确认',
  approved: '已入账',
  rejected: '已拒绝',
};

const rechargeChannelLabels: Record<'wechat' | 'alipay', string> = {
  wechat: '微信支付',
  alipay: '支付宝',
};

export function DemoContent() {
  const { image, imagePreview, handleImageSelection, resetImage } = useImageUpload();
  const { isLoading, results, generateImage, resetResults, errorMessage } =
    useTextToImageContext();
  const {
    user,
    isLoading: authLoading,
    error: authError,
    requestCode,
    register,
    login,
    logout,
    recharge,
    getRechargeOrder,
    refreshUser,
  } = useAuth();
  const [selectedHairstyle, setSelectedHairstyle] = useState<number>(-1);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [rechargeMessage, setRechargeMessage] = useState<string | null>(null);
  const [rechargeOrder, setRechargeOrder] = useState<RechargeOrder | null>(null);
  const [rechargeBusy, setRechargeBusy] = useState(false);
  const [rechargeChannel, setRechargeChannel] = useState<'wechat' | 'alipay'>('wechat');

  useEffect(() => {
    if (!user) {
      setRechargeOrder(null);
      setRechargeMessage(null);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const index = selectedHairstyle - 1;
    const hairstyleData = hairstyles[index];

    if (image && hairstyleData) {
      try {
        await generateImage(image, hairstyleData.imageUrl, hairstyleData.prompt);
      } finally {
        if (user) {
          await refreshUser();
        }
      }
    }
  };

  const handleReset = () => {
    resetResults();
  };

  const handleRequestCode = async () => {
    if (!email) {
      setAuthMessage('请输入邮箱');
      return;
    }

    setAuthBusy(true);
    setAuthMessage(null);
    try {
      await requestCode(email);
      setAuthMessage('验证码已发送');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '发送验证码失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      await register(email, code, password);
      setAuthMessage('注册成功');
      setCode('');
      setPassword('');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '注册失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      await login(email, password);
      setAuthMessage(null);
      setPassword('');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : '登录失败');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRecharge = async (amount: number) => {
    setRechargeMessage(null);
    try {
      setRechargeBusy(true);
      const order = await recharge(amount, rechargeChannel);
      setRechargeOrder(order);
      setRechargeMessage(`已生成充值订单，请完成支付，支付成功后积分会自动到账。订单号：${order.id}`);
    } catch (error) {
      setRechargeMessage(error instanceof Error ? error.message : '充值失败');
    } finally {
      setRechargeBusy(false);
    }
  };

  const handleCheckRechargeStatus = async () => {
    if (!rechargeOrder) {
      return;
    }

    setRechargeMessage(null);
    try {
      setRechargeBusy(true);
      const latest = await getRechargeOrder(rechargeOrder.id);
      setRechargeOrder(latest);

      if (latest.status === 'approved') {
        await refreshUser();
        setRechargeMessage('支付已确认，积分已到账。');
      } else if (latest.status === 'rejected') {
        setRechargeMessage(
          latest.note ? `支付被拒绝：${latest.note}` : '支付被拒绝，请联系管理员。'
        );
      } else {
        setRechargeMessage('支付待确认，请稍后刷新。');
      }
    } catch (error) {
      setRechargeMessage(error instanceof Error ? error.message : '查询支付状态失败。');
    } finally {
      setRechargeBusy(false);
    }
  };

  const canGenerate = Boolean(user) && image && selectedHairstyle !== -1;
  const insufficientPoints = user ? user.pointsBalance < 5 : false;

  return (
    <div className="flex flex-col gap-8">
      <div
        className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center animate-[rise-in_0.6s_ease-out] [animation-fill-mode:both]"
        style={{ animationDelay: '40ms' }}
      >
        <p className="text-xs uppercase tracking-[0.35em] text-[#9A9186]">
          发型焕新工作室
        </p>
        <h2 className="text-3xl font-medium text-[#1A1A1A] sm:text-4xl">
          我们不生产发型，我们制造自信
        </h2>
        <p className="text-base text-[#7C7C7C] sm:text-lg">
          放慢脚步，尝试一个新造型，让每一次改变更接近你想要的自己。
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-[0_24px_60px_rgba(16,16,16,0.12)] animate-[fade-in-soft_0.8s_ease-out] [animation-fill-mode:both]"
        style={{
          '--panel-bg': '#FBF8F2',
          '--panel-border': '#E7DFD3',
          animationDelay: '120ms',
        } as CSSProperties}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,_#F6E7D3_0%,_rgba(246,231,211,0)_70%)]" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,_#DDE6DE_0%,_rgba(221,230,222,0)_70%)]" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[#1A1A1A]">账号</h3>
              <p className="text-sm text-[#7C7C7C]">登录后可充值并生成。</p>
            </div>
            {user && (
              <Button variant="outline" onClick={logout} className="rounded-full">
                退出登录
              </Button>
            )}
          </div>

          {authLoading ? (
            <p className="text-sm text-[#7C7C7C]">正在加载账号信息...</p>
          ) : user ? (
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-[var(--panel-border)] bg-white/70 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#9A9186]">
                    已登录邮箱
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-[#1A1A1A]">
                    {user.email}
                  </p>
                </div>
                <div className="rounded-xl border border-[#111111] bg-[#111111] p-4 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">
                    积分余额
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{user.pointsBalance}</p>
                  <p className="mt-1 text-xs text-white/60">每次生成消耗 5 积分</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-white/70 p-4 backdrop-blur">
                  <p className="text-sm font-medium text-[#1A1A1A]">支付方式</p>
                  <p className="text-xs text-[#7C7C7C]">支持微信与支付宝。</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={rechargeChannel === 'wechat' ? 'default' : 'outline'}
                      onClick={() => setRechargeChannel('wechat')}
                      disabled={rechargeBusy}
                      className="rounded-full"
                    >
                      微信支付
                    </Button>
                    <Button
                      variant={rechargeChannel === 'alipay' ? 'default' : 'outline'}
                      onClick={() => setRechargeChannel('alipay')}
                      disabled={rechargeBusy}
                      className="rounded-full"
                    >
                      支付宝
                    </Button>
                  </div>
                  <div className="rounded-lg border border-dashed border-[#D7CFC3] bg-white/80 px-3 py-2 text-xs text-[#7C7C7C]">
                    已选择：{rechargeChannelLabels[rechargeChannel]}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-white/70 p-4 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#1A1A1A]">充值金额</p>
                    <span className="text-xs text-[#7C7C7C]">1 元 = 10 积分</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[1, 5, 10, 50].map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => handleRecharge(amount)}
                        disabled={rechargeBusy}
                        className="rounded-full"
                      >
                        {amount} 元
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-[#7C7C7C]">支付成功后积分自动到账。</p>

                  {rechargeOrder && (
                    <div className="rounded-lg border border-dashed border-[#D7CFC3] bg-white/80 p-3 text-xs text-[#5F5A53]">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.2em] text-[#9A9186]">
                        <span>订单详情</span>
                        <span>{rechargeStatusLabels[rechargeOrder.status]}</span>
                      </div>
                      <div className="mt-2 grid gap-1">
                        <p>订单号：{rechargeOrder.id}</p>
                        <p>
                          金额：{rechargeOrder.amount} 元 / 积分：{rechargeOrder.points}
                        </p>
                        <p>
                          支付方式：
                          {rechargeOrder.channel
                            ? rechargeChannelLabels[rechargeOrder.channel]
                            : rechargeChannelLabels[rechargeChannel]}
                        </p>
                        {rechargeOrder.providerTradeNo && (
                          <p>平台单号：{rechargeOrder.providerTradeNo}</p>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        {rechargeOrder.qrCodeUrl ? (
                          <img
                            src={rechargeOrder.qrCodeUrl}
                            alt="支付二维码"
                            className="h-28 w-28 rounded-md border border-[#E4E5E6] object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : rechargeOrder.payUrl ? (
                          <a
                            href={rechargeOrder.payUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded-full border border-[#D0D4D4] px-4 py-2 text-xs text-[#1A1A1A]"
                          >
                            打开支付链接
                          </a>
                        ) : (
                          <p>支付信息生成中...</p>
                        )}
                        <Button
                          variant="outline"
                          onClick={handleCheckRechargeStatus}
                          disabled={rechargeBusy}
                          className="rounded-full"
                        >
                          {rechargeBusy ? '查询中...' : '刷新状态'}
                        </Button>
                      </div>
                    </div>
                  )}
                  {rechargeMessage && (
                    <p className="text-xs text-[#7C7C7C]">{rechargeMessage}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--panel-border)] bg-white/70 p-5 backdrop-blur">
              <div className="flex gap-2">
                <Button
                  variant={authMode === 'login' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('login')}
                  className="rounded-full"
                >
                  登录
                </Button>
                <Button
                  variant={authMode === 'register' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('register')}
                  className="rounded-full"
                >
                  注册
                </Button>
              </div>

              <form
                onSubmit={authMode === 'login' ? handleLogin : handleRegister}
                className="mt-4 flex flex-col gap-3"
              >
                <input
                  type="email"
                  placeholder="邮箱"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  className="rounded-md border border-[#D0D4D4] px-3 py-2 text-sm outline-none focus:border-black"
                />
                {authMode === 'register' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="验证码"
                      value={code}
                      onChange={event => setCode(event.target.value)}
                      className="w-full rounded-md border border-[#D0D4D4] px-3 py-2 text-sm outline-none focus:border-black"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRequestCode}
                      disabled={authBusy}
                      className="rounded-full"
                    >
                      发送验证码
                    </Button>
                  </div>
                )}
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  className="rounded-md border border-[#D0D4D4] px-3 py-2 text-sm outline-none focus:border-black"
                />
                <Button type="submit" disabled={authBusy} className="rounded-full">
                  {authMode === 'login' ? '登录' : '创建账号'}
                </Button>
              </form>

              {(authMessage || authError) && (
                <p className="mt-3 text-xs text-[#7C7C7C]">{authMessage || authError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-[#D0D4D4] bg-white shadow-[0_18px_40px_rgba(15,15,15,0.06)] animate-[rise-in_0.7s_ease-out] [animation-fill-mode:both] [animation-delay:200ms]">
        {isLoading ? (
          <LoadingState onCancel={() => handleReset()} />
        ) : (
          <>
            {results.length > 0 ? (
              <ResultView results={results} onReset={handleReset} />
            ) : (
              <>
                <div className="flex h-full flex-col items-center justify-between py-8 md:flex-row">
                  <div className="mb-8 flex w-full flex-1 flex-col gap-4 px-6 md:mb-0 md:w-auto md:px-12">
                    <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-[#0C0C0C]">
                      添加自拍
                    </p>
                    {imagePreview ? (
                      <ImagePreview imageUrl={imagePreview} onClear={resetImage} />
                    ) : (
                      <ImagePicker onImageSelected={handleImageSelection} />
                    )}
                  </div>
                  <div className="flex w-full flex-1 flex-col gap-4 border-[#E4E5E6] px-6 md:w-auto md:border-l md:px-12">
                    <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-[#0C0C0C]">
                      选择发型
                    </p>
                    <HairstyleSelector onSelect={setSelectedHairstyle} />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end border-t border-[#E4E5E6] px-4 py-4 sm:px-8">
                  {!user && (
                    <p className="mr-4 self-center text-xs text-[#7C7C7C]">
                      请先登录再生成。
                    </p>
                  )}
                  {insufficientPoints && (
                    <p className="mr-4 self-center text-xs text-[#7C7C7C]">
                      积分不足，请先充值。
                    </p>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!canGenerate || insufficientPoints}
                    className="w-full rounded-full sm:w-auto"
                  >
                    生成
                  </Button>
                </div>
                {errorMessage && (
                  <div className="px-4 pb-4 sm:px-8">
                    <p className="text-xs text-[#7C7C7C]">{errorMessage}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

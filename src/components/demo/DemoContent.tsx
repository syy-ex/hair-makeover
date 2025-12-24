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
import { useEffect, useState } from 'react';
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
  approved: '已确认',
  rejected: '已拒绝',
};

export function DemoContent() {
  const { image, imagePreview, handleImageSelection, resetImage } = useImageUpload();
  const { isLoading, results, generateImage, resetResults, errorMessage } = useTextToImageContext();
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
  const [qrLoadError, setQrLoadError] = useState(false);
  const wechatQrUrl = process.env.NEXT_PUBLIC_WECHAT_QR_URL || '';

  useEffect(() => {
    setQrLoadError(false);
  }, [wechatQrUrl]);

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
      const order = await recharge(amount);
      setRechargeOrder(order);
      setRechargeMessage(`已生成充值订单，请扫码支付并等待人工确认。订单号：${order.id}`);
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
        setRechargeMessage('充值已确认，积分已到账。');
      } else if (latest.status === 'rejected') {
        setRechargeMessage(latest.note ? `充值被拒绝：${latest.note}` : '充值被拒绝，请联系管理员。');
      } else {
        setRechargeMessage('充值待确认，请稍后刷新。');
      }
    } catch (error) {
      setRechargeMessage(error instanceof Error ? error.message : '查询充值状态失败');
    } finally {
      setRechargeBusy(false);
    }
  };

  const canGenerate = Boolean(user) && image && selectedHairstyle !== -1;
  const insufficientPoints = user ? user.pointsBalance < 5 : false;
  const qrFallbackText = wechatQrUrl
    ? '二维码加载失败，请检查图片地址是否可访问'
    : '请设置 NEXT_PUBLIC_WECHAT_QR_URL';

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex flex-col items-center gap-2.5">
        <h2 className="text-3xl font-normal text-[#0C0C0C] sm:text-4xl">我们不生产发型，我们制造自信</h2>
        <p className="text-base font-normal text-[#7C7C7C] sm:text-lg">
          在快节奏的都市生活中，本店是一个暂停键。我们摒弃了传统理发店的嘈杂与推销，只保留最纯粹的修剪技艺。我们的理发师不仅仅是工匠，更是面部美学的建筑师。
        </p>
      </div>

      <div className="flex flex-col rounded-lg border border-[#D0D4D4] bg-white">
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#0C0C0C]">账号</h3>
              <p className="text-sm text-[#7C7C7C]">登录后可充值并使用积分。</p>
            </div>
            {user && (
              <Button variant="outline" onClick={logout}>
                退出登录
              </Button>
            )}
          </div>

          {authLoading ? (
            <p className="text-sm text-[#7C7C7C]">正在加载账号信息...</p>
          ) : user ? (
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col gap-3">
                <div className="rounded-md border border-[#E4E5E6] bg-[#FAFAFA] p-4">
                  <p className="text-xs uppercase text-[#7C7C7C]">已登录邮箱</p>
                  <p className="text-sm font-medium text-[#0C0C0C]">{user.email}</p>
                </div>
                <div className="rounded-md border border-[#E4E5E6] bg-[#FAFAFA] p-4">
                  <p className="text-xs uppercase text-[#7C7C7C]">积分余额</p>
                  <p className="text-2xl font-semibold text-[#0C0C0C]">{user.pointsBalance}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 rounded-md border border-[#E4E5E6] bg-[#FAFAFA] p-4">
                  <p className="text-sm font-medium text-[#0C0C0C]">微信收款码</p>
                  {wechatQrUrl && !qrLoadError ? (
                    <img
                      src={wechatQrUrl}
                      alt="微信收款码"
                      className="h-40 w-40 rounded-md border border-[#E4E5E6] object-contain"
                      referrerPolicy="no-referrer"
                      onError={() => setQrLoadError(true)}
                    />
                  ) : (
                    <div className="flex h-40 w-40 items-center justify-center rounded-md border border-dashed border-[#D0D4D4] text-xs text-[#7C7C7C]">
                      {qrFallbackText}
                    </div>
                  )}
                  <p className="text-xs text-[#7C7C7C]">
                    扫码付款后请等待人工确认到账。
                  </p>
                </div>

                <div className="flex flex-col gap-3 rounded-md border border-[#E4E5E6] bg-[#FAFAFA] p-4">
                  <p className="text-sm font-medium text-[#0C0C0C]">充值</p>
                  <p className="text-xs text-[#7C7C7C]">每 1 元 = 10 积分，人工确认后到账。</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 5, 10, 50].map(amount => (
                      <Button
                        key={amount}
                        variant="outline"
                        onClick={() => handleRecharge(amount)}
                        disabled={rechargeBusy}
                      >
                        {amount} 元
                      </Button>
                    ))}
                  </div>
                  {rechargeOrder && (
                    <div className="rounded-md border border-dashed border-[#D0D4D4] px-3 py-2 text-xs text-[#7C7C7C]">
                      <p>订单号：{rechargeOrder.id}</p>
                      <p>
                        金额：{rechargeOrder.amount} 元 / 积分：{rechargeOrder.points}
                      </p>
                      <p>状态：{rechargeStatusLabels[rechargeOrder.status]}</p>
                      <Button
                        variant="outline"
                        onClick={handleCheckRechargeStatus}
                        disabled={rechargeBusy}
                        className="mt-2"
                      >
                        {rechargeBusy ? '查询中...' : '刷新状态'}
                      </Button>
                    </div>
                  )}
                  {rechargeMessage && (
                    <p className="text-xs text-[#7C7C7C]">{rechargeMessage}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <Button
                  variant={authMode === 'login' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('login')}
                >
                  登录
                </Button>
                <Button
                  variant={authMode === 'register' ? 'default' : 'outline'}
                  onClick={() => setAuthMode('register')}
                >
                  注册
                </Button>
              </div>

              <form
                onSubmit={authMode === 'login' ? handleLogin : handleRegister}
                className="flex flex-col gap-3"
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
                <Button type="submit" disabled={authBusy}>
                  {authMode === 'login' ? '登录' : '创建账号'}
                </Button>
              </form>

              {(authMessage || authError) && (
                <p className="text-xs text-[#7C7C7C]">{authMessage || authError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-[#D0D4D4] bg-white">
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
                    <p className="text-center text-xs font-medium text-[#0C0C0C] uppercase">
                      添加自拍
                    </p>
                    {imagePreview ? (
                      <ImagePreview imageUrl={imagePreview} onClear={resetImage} />
                    ) : (
                      <ImagePicker onImageSelected={handleImageSelection} />
                    )}
                  </div>
                  <div className="flex w-full flex-1 flex-col gap-4 border-[#E4E5E6] px-6 md:w-auto md:border-l md:px-12">
                    <p className="text-center text-xs font-medium text-[#0C0C0C] uppercase">
                      选择发型
                    </p>
                    <HairstyleSelector onSelect={setSelectedHairstyle} />
                  </div>
                </div>

                <div className="flex flex-wrap justify-end border-t border-[#E4E5E6] px-4 py-4 sm:px-8">
                  {!user && (
                    <p className="mr-4 self-center text-xs text-[#7C7C7C]">
                      请先登录再生成图片。
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
                    className="w-full sm:w-auto"
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

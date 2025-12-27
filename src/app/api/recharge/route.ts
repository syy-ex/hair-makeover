import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createRechargeOrder, updateRechargeOrderPayment } from '@/lib/db';
import { createEpayOrder, type EpayChannel } from '@/lib/epay';

export const runtime = 'nodejs';

const ALLOWED_AMOUNTS = [1, 5, 10, 50];
const ALLOWED_CHANNELS: EpayChannel[] = ['wechat', 'alipay'];

function getRequestBaseUrl(req: NextRequest): string | null {
  const envBaseUrl = process.env.PAYMENT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/+$/, '');
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) {
    return null;
  }
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

function getClientIp(req: NextRequest): string | undefined {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim();
  }
  return req.headers.get('x-real-ip') || undefined;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { amount, channel } = await req.json();
    const numericAmount = Number(amount);
    const requestedChannel = channel as EpayChannel | undefined;
    const normalizedChannel: EpayChannel = requestedChannel === 'alipay' ? 'alipay' : 'wechat';

    if (!ALLOWED_AMOUNTS.includes(numericAmount)) {
      return NextResponse.json({ error: '充值金额不合法' }, { status: 400 });
    }

    if (requestedChannel && !ALLOWED_CHANNELS.includes(requestedChannel)) {
      return NextResponse.json({ error: '鏀粯鏂瑰紡涓嶅悎娉�' }, { status: 400 });
    }

    const order = await createRechargeOrder(user.id, numericAmount, {
      provider: 'epay',
      channel: normalizedChannel,
    });

    const baseUrl = getRequestBaseUrl(req);
    if (!baseUrl) {
      return NextResponse.json({ error: '鏃犳硶鑾峰彇鍥炶皟鍩熷悕' }, { status: 500 });
    }

    const notifyUrl = process.env.EPAY_NOTIFY_URL || `${baseUrl}/api/recharge/notify`;
    const returnUrl = process.env.EPAY_RETURN_URL || baseUrl;

    const payment = await createEpayOrder({
      amount: numericAmount,
      outTradeNo: order.id,
      name: `充值${numericAmount}元`,
      notifyUrl,
      returnUrl,
      channel: normalizedChannel,
      clientIp: getClientIp(req),
    });

    const updated = await updateRechargeOrderPayment(order.id, {
      provider: 'epay',
      channel: normalizedChannel,
      providerTradeNo: payment.tradeNo,
      payUrl: payment.payUrl,
      qrCodeUrl: payment.qrCodeUrl,
    });
    const responseOrder = updated ?? order;

    return NextResponse.json({
      order: {
        id: responseOrder.id,
        amount: responseOrder.amount,
        points: responseOrder.points,
        status: responseOrder.status,
        createdAt: responseOrder.createdAt,
        provider: responseOrder.provider,
        channel: responseOrder.channel,
        providerTradeNo: responseOrder.providerTradeNo,
        payUrl: responseOrder.payUrl,
        qrCodeUrl: responseOrder.qrCodeUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

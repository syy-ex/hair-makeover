import { NextRequest, NextResponse } from 'next/server';
import {
  approveRechargeOrder,
  getRechargeOrderById,
  updateRechargeOrderPayment,
} from '@/lib/db';
import {
  getEpayAmount,
  getEpayOrderId,
  getEpayTradeNo,
  isEpayPaid,
  verifyEpaySignature,
} from '@/lib/epay';

export const runtime = 'nodejs';

function toStringMap(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[key] = String(value);
  }
  return result;
}

async function readParams(req: NextRequest): Promise<Record<string, string>> {
  if (req.method === 'GET') {
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await req.json();
    return toStringMap(data);
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function textResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function handleNotify(req: NextRequest): Promise<NextResponse> {
  try {
    const params = await readParams(req);
    const pid = process.env.EPAY_PID;
    if (pid && params.pid && params.pid !== pid) {
      return textResponse('fail', 401);
    }

    if (!verifyEpaySignature(params)) {
      return textResponse('fail', 401);
    }

    const orderId = getEpayOrderId(params);
    if (!orderId) {
      return textResponse('fail', 400);
    }

    const order = await getRechargeOrderById(orderId);
    if (!order) {
      return textResponse('fail', 404);
    }

    const amount = getEpayAmount(params);
    if (amount === null || Math.abs(amount - order.amount) > 0.0001) {
      return textResponse('fail', 409);
    }

    if (!isEpayPaid(params)) {
      return textResponse('fail', 409);
    }

    const tradeNo = getEpayTradeNo(params);
    const channel =
      params.type === 'alipay' ? 'alipay' : params.type === 'wxpay' ? 'wechat' : undefined;

    await updateRechargeOrderPayment(orderId, {
      provider: 'epay',
      channel,
      providerTradeNo: tradeNo || undefined,
    });

    await approveRechargeOrder(orderId, `auto_epay:${params.type || 'unknown'}`);
    return textResponse('success', 200);
  } catch (error) {
    return textResponse('fail', 500);
  }
}

export async function POST(req: NextRequest) {
  return handleNotify(req);
}

export async function GET(req: NextRequest) {
  return handleNotify(req);
}

import { NextRequest, NextResponse } from 'next/server';
import {
  approveRechargeOrder,
  getUserById,
  listRechargeOrders,
  rejectRechargeOrder,
} from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { getAdminEmails, isAdminUser } from '@/lib/admin';

export const runtime = 'nodejs';

async function ensureAdmin(req: NextRequest): Promise<NextResponse | null> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  if (getAdminEmails().length === 0) {
    return NextResponse.json({ error: '未配置管理员邮箱' }, { status: 500 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  return null;
}

export async function GET(req: NextRequest) {
  const authError = await ensureAdmin(req);
  if (authError) {
    return authError;
  }

  const statusParam = req.nextUrl.searchParams.get('status');
  const status =
    statusParam === 'pending' || statusParam === 'approved' || statusParam === 'rejected'
      ? statusParam
      : undefined;

  const orders = await listRechargeOrders(status);
  const enriched = await Promise.all(
    orders.map(async order => {
      const user = await getUserById(order.userId);
      return {
        id: order.id,
        userId: order.userId,
        userEmail: user?.email || '未知用户',
        amount: order.amount,
        points: order.points,
        status: order.status,
        createdAt: order.createdAt,
        reviewedAt: order.reviewedAt,
        note: order.note,
        provider: order.provider,
        channel: order.channel,
        providerTradeNo: order.providerTradeNo,
        payUrl: order.payUrl,
        qrCodeUrl: order.qrCodeUrl,
      };
    })
  );

  return NextResponse.json({ orders: enriched });
}

export async function POST(req: NextRequest) {
  const authError = await ensureAdmin(req);
  if (authError) {
    return authError;
  }

  try {
    const { orderId, action, note } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: '订单 ID 不能为空' }, { status: 400 });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: '操作不合法' }, { status: 400 });
    }

    const order =
      action === 'approve'
        ? await approveRechargeOrder(orderId, note)
        : await rejectRechargeOrder(orderId, note);

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        userId: order.userId,
        amount: order.amount,
        points: order.points,
        status: order.status,
        createdAt: order.createdAt,
        reviewedAt: order.reviewedAt,
        note: order.note,
        provider: order.provider,
        channel: order.channel,
        providerTradeNo: order.providerTradeNo,
        payUrl: order.payUrl,
        qrCodeUrl: order.qrCodeUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

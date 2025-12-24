import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getRechargeOrderById } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: '订单 ID 不能为空' }, { status: 400 });
  }

  const order = await getRechargeOrderById(orderId);
  if (!order || order.userId !== user.id) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      amount: order.amount,
      points: order.points,
      status: order.status,
      createdAt: order.createdAt,
      reviewedAt: order.reviewedAt,
      note: order.note,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { createRechargeOrder } from '@/lib/db';

export const runtime = 'nodejs';

const ALLOWED_AMOUNTS = [1, 5, 10, 50];

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { amount } = await req.json();
    const numericAmount = Number(amount);

    if (!ALLOWED_AMOUNTS.includes(numericAmount)) {
      return NextResponse.json({ error: '充值金额不合法' }, { status: 400 });
    }

    const order = await createRechargeOrder(user.id, numericAmount);

    return NextResponse.json({
      order: {
        id: order.id,
        amount: order.amount,
        points: order.points,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';
import { startSession } from '@/lib/auth';
import { isValidEmail } from '@/lib/validators';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: '请输入密码' }, { status: 400 });
    }

    const user = await getUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
    }

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        pointsBalance: user.pointsBalance,
        isAdmin: isAdminUser(user),
      },
    });

    await startSession(res, user.id);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

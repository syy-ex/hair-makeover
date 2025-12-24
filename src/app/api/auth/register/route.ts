import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail, verifyEmailCode } from '@/lib/db';
import { isAdminUser } from '@/lib/admin';
import { startSession } from '@/lib/auth';
import { isValidEmail, isValidPassword } from '@/lib/validators';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json();

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    if (!password || !isValidPassword(password)) {
      return NextResponse.json({ error: '密码至少 8 位' }, { status: 400 });
    }

    const trimmedCode = String(code || '').trim();
    if (!trimmedCode) {
      return NextResponse.json({ error: '请输入验证码' }, { status: 400 });
    }
    if (!/^\d{6}$/.test(trimmedCode)) {
      return NextResponse.json({ error: '验证码格式不正确' }, { status: 400 });
    }

    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: '邮箱已注册' }, { status: 409 });
    }

    const codeOk = await verifyEmailCode(normalizedEmail, trimmedCode);
    if (!codeOk) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(normalizedEmail, passwordHash);

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
    if (message === 'User already exists') {
      return NextResponse.json({ error: '邮箱已注册' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

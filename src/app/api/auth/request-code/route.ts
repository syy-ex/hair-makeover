import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, storeEmailCode } from '@/lib/db';
import { sendVerificationCode } from '@/lib/email';
import { isValidEmail } from '@/lib/validators';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }
    const existing = await getUserByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json({ error: '邮箱已注册' }, { status: 409 });
    }

    const code = `${Math.floor(100000 + Math.random() * 900000)}`;
    await storeEmailCode(normalizedEmail, code);
    await sendVerificationCode(normalizedEmail, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    if (message === 'Code requested too frequently') {
      return NextResponse.json({ error: '验证码发送过于频繁' }, { status: 429 });
    }
    if (message === 'SMTP configuration is missing') {
      return NextResponse.json({ error: '邮箱服务配置缺失' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

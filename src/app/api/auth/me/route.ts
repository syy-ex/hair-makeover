import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { isAdminUser } from '@/lib/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      pointsBalance: user.pointsBalance,
      isAdmin: isAdminUser(user),
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createSession, deleteSession, getUserBySessionToken } from '@/lib/db';

const SESSION_COOKIE_NAME = 'hair_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function getSessionToken(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getUserFromRequest(req: NextRequest) {
  const token = getSessionToken(req);
  if (!token) {
    return null;
  }
  return getUserBySessionToken(token);
}

export async function startSession(res: NextResponse, userId: string) {
  const session = await createSession(userId);
  res.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
  return session;
}

export async function endSession(req: NextRequest, res: NextResponse) {
  const token = getSessionToken(req);
  if (token) {
    await deleteSession(token);
  }
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });
}

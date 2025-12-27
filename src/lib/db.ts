import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

type User = {
  id: string;
  email: string;
  passwordHash: string;
  pointsBalance: number;
  createdAt: string;
};

type Session = {
  token: string;
  userId: string;
  expiresAt: string;
};

type EmailCode = {
  email: string;
  codeHash: string;
  purpose: 'register';
  expiresAt: string;
  cooldownUntil: string;
};

type PointsLedger = {
  id: string;
  userId: string;
  delta: number;
  reason: string;
  createdAt: string;
};

type RechargeOrderStatus = 'pending' | 'approved' | 'rejected';

type PaymentProvider = 'epay';
type PaymentChannel = 'wechat' | 'alipay';

type RechargeOrder = {
  id: string;
  userId: string;
  amount: number;
  points: number;
  status: RechargeOrderStatus;
  createdAt: string;
  reviewedAt?: string;
  note?: string;
  provider?: PaymentProvider;
  channel?: PaymentChannel;
  providerTradeNo?: string;
  payUrl?: string;
  qrCodeUrl?: string;
};

type Database = {
  users: User[];
  sessions: Session[];
  emailCodes: EmailCode[];
  pointsLedger: PointsLedger[];
  rechargeOrders: RechargeOrder[];
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SESSION_TTL_DAYS = 7;

let dbLock: Promise<void> = Promise.resolve();

async function ensureDbFile(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const emptyDb: Database = {
      users: [],
      sessions: [],
      emailCodes: [],
      pointsLedger: [],
      rechargeOrders: [],
    };
    await fs.writeFile(DB_PATH, JSON.stringify(emptyDb, null, 2), 'utf8');
  }
}

function normalizeDb(db: Partial<Database>): Database {
  return {
    users: Array.isArray(db.users) ? db.users : [],
    sessions: Array.isArray(db.sessions) ? db.sessions : [],
    emailCodes: Array.isArray(db.emailCodes) ? db.emailCodes : [],
    pointsLedger: Array.isArray(db.pointsLedger) ? db.pointsLedger : [],
    rechargeOrders: Array.isArray(db.rechargeOrders) ? db.rechargeOrders : [],
  };
}

async function readDb(): Promise<Database> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_PATH, 'utf8');
  return normalizeDb(JSON.parse(raw) as Partial<Database>);
}

async function writeDb(db: Database): Promise<void> {
  await ensureDbFile();
  const tempPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(tempPath, DB_PATH);
}

async function withDbLock<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  let releaseLock: () => void;
  const nextLock = new Promise<void>(resolve => {
    releaseLock = resolve;
  });

  const currentLock = dbLock;
  dbLock = currentLock.then(() => nextLock);
  await currentLock;

  try {
    const db = await readDb();
    const result = await fn(db);
    await writeDb(db);
    return result;
  } finally {
    releaseLock!();
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function hashCode(code: string): string {
  const secret = process.env.AUTH_CODE_SECRET || 'dev-auth-code-secret';
  return crypto.createHash('sha256').update(`${secret}:${code}`).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isExpired(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await readDb();
  const normalized = normalizeEmail(email);
  return db.users.find(user => user.email === normalized) || null;
}

export async function getUserById(userId: string): Promise<User | null> {
  const db = await readDb();
  return db.users.find(user => user.id === userId) || null;
}

export async function createUser(email: string, passwordHash: string): Promise<User> {
  return withDbLock(async db => {
    const normalized = normalizeEmail(email);
    const existing = db.users.find(user => user.email === normalized);
    if (existing) {
      throw new Error('User already exists');
    }

    const user: User = {
      id: crypto.randomUUID(),
      email: normalized,
      passwordHash,
      pointsBalance: 0,
      createdAt: nowIso(),
    };
    db.users.push(user);
    return user;
  });
}

export async function createSession(userId: string): Promise<Session> {
  return withDbLock(async db => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addDays(new Date(), SESSION_TTL_DAYS).toISOString();
    const session: Session = { token, userId, expiresAt };
    db.sessions.push(session);
    return session;
  });
}

export async function deleteSession(token: string): Promise<void> {
  await withDbLock(async db => {
    db.sessions = db.sessions.filter(session => session.token !== token);
  });
}

export async function getUserBySessionToken(token: string): Promise<User | null> {
  const db = await readDb();
  const session = db.sessions.find(item => item.token === token);
  if (!session) {
    return null;
  }

  if (isExpired(session.expiresAt)) {
    await withDbLock(async lockedDb => {
      lockedDb.sessions = lockedDb.sessions.filter(item => item.token !== token);
    });
    return null;
  }

  return db.users.find(user => user.id === session.userId) || null;
}

export async function storeEmailCode(email: string, code: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const ttlMinutes = 10;
  const cooldownSeconds = 60;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString();
  const cooldownUntil = new Date(now.getTime() + cooldownSeconds * 1000).toISOString();

  await withDbLock(async db => {
    const existing = db.emailCodes.find(
      item => item.email === normalized && item.purpose === 'register'
    );
    if (existing && !isExpired(existing.cooldownUntil)) {
      throw new Error('Code requested too frequently');
    }

    db.emailCodes = db.emailCodes.filter(
      item => item.email !== normalized || item.purpose !== 'register'
    );

    db.emailCodes.push({
      email: normalized,
      codeHash: hashCode(code),
      purpose: 'register',
      expiresAt,
      cooldownUntil,
    });
  });
}

export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  return withDbLock(async db => {
    const record = db.emailCodes.find(
      item => item.email === normalized && item.purpose === 'register'
    );
    if (!record) {
      return false;
    }

    if (isExpired(record.expiresAt)) {
      db.emailCodes = db.emailCodes.filter(item => item !== record);
      return false;
    }

    const matches = record.codeHash === hashCode(code);
    if (matches) {
      db.emailCodes = db.emailCodes.filter(item => item !== record);
    }

    return matches;
  });
}

export async function getPointsBalance(userId: string): Promise<number> {
  const db = await readDb();
  const user = db.users.find(item => item.id === userId);
  return user?.pointsBalance ?? 0;
}

export async function creditPoints(
  userId: string,
  amount: number,
  reason: string
): Promise<number> {
  return withDbLock(async db => {
    const user = db.users.find(item => item.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.pointsBalance += amount;
    db.pointsLedger.push({
      id: crypto.randomUUID(),
      userId,
      delta: amount,
      reason,
      createdAt: nowIso(),
    });

    return user.pointsBalance;
  });
}

export async function debitPoints(
  userId: string,
  amount: number,
  reason: string
): Promise<{ ok: boolean; balance: number }> {
  return withDbLock(async db => {
    const user = db.users.find(item => item.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.pointsBalance < amount) {
      return { ok: false, balance: user.pointsBalance };
    }

    user.pointsBalance -= amount;
    db.pointsLedger.push({
      id: crypto.randomUUID(),
      userId,
      delta: -amount,
      reason,
      createdAt: nowIso(),
    });

    return { ok: true, balance: user.pointsBalance };
  });
}

export async function createRechargeOrder(
  userId: string,
  amount: number,
  options?: { provider?: PaymentProvider; channel?: PaymentChannel }
): Promise<RechargeOrder> {
  return withDbLock(async db => {
    const user = db.users.find(item => item.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const order: RechargeOrder = {
      id: crypto.randomUUID(),
      userId,
      amount,
      points: amount * 10,
      status: 'pending',
      createdAt: nowIso(),
      provider: options?.provider,
      channel: options?.channel,
    };

    db.rechargeOrders.push(order);
    return order;
  });
}

export async function updateRechargeOrderPayment(
  orderId: string,
  update: {
    provider?: PaymentProvider;
    channel?: PaymentChannel;
    providerTradeNo?: string;
    payUrl?: string;
    qrCodeUrl?: string;
  }
): Promise<RechargeOrder | null> {
  return withDbLock(async db => {
    const order = db.rechargeOrders.find(item => item.id === orderId);
    if (!order) {
      return null;
    }

    if (update.provider) {
      order.provider = update.provider;
    }
    if (update.channel) {
      order.channel = update.channel;
    }
    if (update.providerTradeNo) {
      order.providerTradeNo = update.providerTradeNo;
    }
    if (update.payUrl) {
      order.payUrl = update.payUrl;
    }
    if (update.qrCodeUrl) {
      order.qrCodeUrl = update.qrCodeUrl;
    }

    return order;
  });
}

export async function getRechargeOrderById(orderId: string): Promise<RechargeOrder | null> {
  const db = await readDb();
  return db.rechargeOrders.find(order => order.id === orderId) || null;
}

export async function listRechargeOrders(
  status?: RechargeOrderStatus
): Promise<RechargeOrder[]> {
  const db = await readDb();
  const orders = status
    ? db.rechargeOrders.filter(order => order.status === status)
    : db.rechargeOrders;
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function approveRechargeOrder(
  orderId: string,
  note?: string
): Promise<RechargeOrder | null> {
  return withDbLock(async db => {
    const order = db.rechargeOrders.find(item => item.id === orderId);
    if (!order) {
      return null;
    }

    if (order.status !== 'pending') {
      return order;
    }

    const user = db.users.find(item => item.id === order.userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.pointsBalance += order.points;
    db.pointsLedger.push({
      id: crypto.randomUUID(),
      userId: user.id,
      delta: order.points,
      reason: `recharge_order_${order.id}`,
      createdAt: nowIso(),
    });

    order.status = 'approved';
    order.reviewedAt = nowIso();
    if (note) {
      order.note = note;
    }

    return order;
  });
}

export async function rejectRechargeOrder(
  orderId: string,
  note?: string
): Promise<RechargeOrder | null> {
  return withDbLock(async db => {
    const order = db.rechargeOrders.find(item => item.id === orderId);
    if (!order) {
      return null;
    }

    if (order.status !== 'pending') {
      return order;
    }

    order.status = 'rejected';
    order.reviewedAt = nowIso();
    if (note) {
      order.note = note;
    }

    return order;
  });
}

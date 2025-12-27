import crypto from 'crypto';

export type EpayChannel = 'wechat' | 'alipay';

type EpayConfig = {
  baseUrl: string;
  pid: string;
  md5Key: string;
  apiPath: string;
  act: string;
  wechatType: string;
  alipayType: string;
  signStyle: 'plain' | 'key';
};

export type EpayCreateOrderInput = {
  amount: number;
  outTradeNo: string;
  name: string;
  notifyUrl: string;
  returnUrl?: string;
  channel: EpayChannel;
  clientIp?: string;
};

export type EpayCreateOrderResult = {
  tradeNo?: string;
  payUrl?: string;
  qrCodeUrl?: string;
};

const DEFAULT_API_PATH = '/api.php';
const DEFAULT_ACT = 'pay';

function getConfig(): EpayConfig {
  const baseUrl = process.env.EPAY_BASE_URL;
  const pid = process.env.EPAY_PID;
  const md5Key = process.env.EPAY_MD5_KEY;

  if (!baseUrl || !pid || !md5Key) {
    throw new Error('Epay config missing.');
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    pid,
    md5Key,
    apiPath: process.env.EPAY_API_PATH || DEFAULT_API_PATH,
    act: process.env.EPAY_ACT || DEFAULT_ACT,
    wechatType: process.env.EPAY_WECHAT_TYPE || 'wxpay',
    alipayType: process.env.EPAY_ALIPAY_TYPE || 'alipay',
    signStyle: process.env.EPAY_SIGN_STYLE === 'key' ? 'key' : 'plain',
  };
}

function toStringRecord(input: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }
    result[key] = String(value);
  }
  return result;
}

function canonicalize(params: Record<string, string>): string {
  return Object.entries(params)
    .filter(([key, value]) => {
      if (!value) {
        return false;
      }
      return key !== 'sign' && key !== 'sign_type';
    })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function md5(value: string): string {
  return crypto.createHash('md5').update(value).digest('hex');
}

function signWithKey(params: Record<string, string>, key: string): string {
  const base = canonicalize(params);
  return md5(`${base}${key}`);
}

function signWithKeyPair(params: Record<string, string>, key: string): string {
  const base = canonicalize(params);
  return md5(`${base}&key=${key}`);
}

function signParams(
  params: Record<string, string>,
  key: string,
  style: 'plain' | 'key'
): string {
  return style === 'key' ? signWithKeyPair(params, key) : signWithKey(params, key);
}

export function verifyEpaySignature(params: Record<string, string>): boolean {
  const config = getConfig();
  const signature = params.sign || '';
  if (!signature) {
    return false;
  }
  const normalized = signature.toLowerCase();
  return (
    normalized === signWithKey(params, config.md5Key) ||
    normalized === signWithKeyPair(params, config.md5Key)
  );
}

export function getEpayOrderId(params: Record<string, string>): string | null {
  return params.out_trade_no || params.outTradeNo || params.orderId || null;
}

export function getEpayAmount(params: Record<string, string>): number | null {
  const raw = params.money || params.amount || params.total_fee;
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function isEpayPaid(params: Record<string, string>): boolean {
  const status = (params.status || params.trade_status || '').toLowerCase();
  return status === '1' || status === 'success' || status === 'paid' || status === 'trade_success';
}

export function getEpayTradeNo(params: Record<string, string>): string | null {
  return params.trade_no || params.tradeNo || null;
}

export async function createEpayOrder(
  input: EpayCreateOrderInput
): Promise<EpayCreateOrderResult> {
  const config = getConfig();
  const type = input.channel === 'alipay' ? config.alipayType : config.wechatType;
  const params = toStringRecord({
    act: config.act,
    pid: config.pid,
    type,
    out_trade_no: input.outTradeNo,
    notify_url: input.notifyUrl,
    return_url: input.returnUrl,
    name: input.name,
    money: input.amount,
    clientip: input.clientIp,
  });
  params.sign = signParams(params, config.md5Key, config.signStyle);
  params.sign_type = 'MD5';

  const endpoint = config.apiPath.startsWith('/')
    ? `${config.baseUrl}${config.apiPath}`
    : `${config.baseUrl}/${config.apiPath}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Invalid epay response: ${text}`);
  }

  const codeValue = data.code ?? data.status;
  const code = typeof codeValue === 'string' ? Number(codeValue) : Number(codeValue ?? 0);
  if (!Number.isFinite(code) || code !== 1) {
    const message = typeof data.msg === 'string' ? data.msg : 'Epay create order failed.';
    throw new Error(message);
  }

  const payUrl =
    (typeof data.pay_url === 'string' && data.pay_url) ||
    (typeof data.payurl === 'string' && data.payurl) ||
    (typeof data.url === 'string' && data.url) ||
    undefined;
  const qrCodeUrl =
    (typeof data.qrcode === 'string' && data.qrcode) ||
    (typeof data.qrcode_url === 'string' && data.qrcode_url) ||
    (typeof data.qrCode === 'string' && data.qrCode) ||
    undefined;
  const tradeNo =
    (typeof data.trade_no === 'string' && data.trade_no) ||
    (typeof data.tradeNo === 'string' && data.tradeNo) ||
    undefined;

  return { tradeNo, payUrl, qrCodeUrl };
}

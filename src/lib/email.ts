import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM;

function requireSmtpConfig() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error('SMTP configuration is missing');
  }
}

export async function sendVerificationCode(email: string, code: string) {
  requireSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE || SMTP_PORT === 465,
    auth: {
      user: SMTP_USER!,
      pass: SMTP_PASS!,
    },
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: 'Your verification code',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
}

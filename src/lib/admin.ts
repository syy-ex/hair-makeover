type AdminUserLike = {
  email: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '';
  return raw
    .split(',')
    .map(item => normalizeEmail(item))
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  if (!email) {
    return false;
  }
  const normalized = normalizeEmail(email);
  return getAdminEmails().includes(normalized);
}

export function isAdminUser(user: AdminUserLike | null): boolean {
  if (!user) {
    return false;
  }
  return isAdminEmail(user.email);
}

export function normalizeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email) return "أدخل البريد الإلكتروني.";
  if (email.length > 254 || !EMAIL_RE.test(email)) return "صيغة البريد الإلكتروني غير صحيحة.";
  return null;
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "كلمة المرور يجب ألا تقل عن 8 أحرف.";
  if (pw.length > 72) return "كلمة المرور طويلة جداً. الحد الأقصى 72 حرفاً.";
  if (!/[A-Za-z\u0600-\u06FF]/.test(pw) || !/[0-9\u0660-\u0669]/.test(pw)) {
    return "كلمة المرور يجب أن تحتوي على حروف وأرقام.";
  }
  return null;
}

export function validateFullName(name: string): string | null {
  if (name.length < 2) return "أدخل الاسم الكامل.";
  if (name.length > 80) return "الاسم طويل جداً. الحد الأقصى 80 حرفاً.";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F<>]/.test(name)) return "الاسم يحتوي على رموز غير مسموحة.";
  return null;
}

// Phone is optional. Returns the cleaned value or an error.
export function cleanPhone(raw: string): { value: string | null; error: string | null } {
  const v = raw.replace(/[\s\-()]/g, "");
  if (!v) return { value: null, error: null };
  if (!/^\+?[0-9]{7,15}$/.test(v)) {
    return { value: null, error: "رقم الهاتف غير صحيح. استخدم أرقاماً فقط مع رمز الدولة عند الحاجة." };
  }
  return { value: v, error: null };
}

// Only same-site relative paths are allowed as a post-login destination.
export function safeNext(v: string | null | undefined, fallback = "/account"): string {
  if (!v) return fallback;
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return fallback;
  return v;
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  email_not_confirmed: "لم يتم تأكيد بريدك الإلكتروني بعد. افتح رسالة التأكيد المرسلة إليك ثم حاول مرة أخرى.",
  weak_password: "كلمة المرور ضعيفة. اختر كلمة مرور أقوى.",
  same_password: "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
  over_request_rate_limit: "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.",
  over_email_send_rate_limit: "تم إرسال عدد كبير من الرسائل. انتظر قليلاً ثم أعد المحاولة.",
  user_banned: "هذا الحساب محظور. تواصل مع إدارة المتجر.",
  otp_expired: "انتهت صلاحية الرابط. اطلب رابطاً جديداً.",
  session_expired: "انتهت الجلسة. سجّل الدخول من جديد.",
  session_not_found: "انتهت الجلسة. سجّل الدخول من جديد.",
  refresh_token_not_found: "انتهت الجلسة. سجّل الدخول من جديد.",
  signup_disabled: "إنشاء الحسابات متوقف مؤقتاً.",
};

export function authErrorMessage(err: { code?: string; status?: number } | null | undefined): string {
  if (err?.code && MESSAGES[err.code]) return MESSAGES[err.code];
  if (err?.status === 429) return MESSAGES.over_request_rate_limit;
  return "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.";
}

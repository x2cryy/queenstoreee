"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import type { FormState } from "../../lib/auth/types";
import {
  cleanPhone, normalizeEmail, safeNext, validateEmail, validateFullName, validatePassword,
} from "../../lib/auth/validation";
import { authErrorMessage } from "../../lib/auth/messages";
import { rateLimit } from "../../lib/auth/rate-limit";
import { getSiteUrl } from "../../lib/auth/site-url";

const MIN = 60 * 1000;
const TOO_MANY = "محاولات كثيرة. انتظر بضع دقائق ثم أعد المحاولة.";

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const fieldErrors: Record<string, string> = {};
  const emailErr = validateEmail(email);
  if (emailErr) fieldErrors.email = emailErr;
  if (!password) fieldErrors.password = "أدخل كلمة المرور.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors, values: { email } };

  if (!(await rateLimit("signin", 8, 10 * MIN, email))) {
    return { ok: false, message: TOO_MANY, values: { email } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, message: authErrorMessage(error), values: { email } };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.account_status === "blocked") {
    await supabase.auth.signOut();
    return { ok: false, message: "هذا الحساب محظور. تواصل مع إدارة المتجر.", values: { email } };
  }
  if (!profile) {
    // Fallback if the signup trigger did not create the row (allowed by profiles_insert_own).
    await supabase.from("profiles").insert({ id: data.user.id });
  }

  redirect(next);
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = normalizeEmail(formData.get("email"));
  const phoneRaw = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const values = { full_name: fullName, email, phone: phoneRaw };

  const fieldErrors: Record<string, string> = {};
  const nameErr = validateFullName(fullName);
  if (nameErr) fieldErrors.full_name = nameErr;
  const emailErr = validateEmail(email);
  if (emailErr) fieldErrors.email = emailErr;
  const phone = cleanPhone(phoneRaw);
  if (phone.error) fieldErrors.phone = phone.error;
  const pwErr = validatePassword(password);
  if (pwErr) fieldErrors.password = pwErr;
  else if (password !== confirm) fieldErrors.confirm = "كلمتا المرور غير متطابقتين.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors, values };

  if (!(await rateLimit("signup", 5, 60 * MIN, email))) {
    return { ok: false, message: TOO_MANY, values };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=/account`,
      // Metadata is user-controlled: the database trigger copies only name and phone from it.
      data: { full_name: fullName, phone: phone.value ?? "" },
    },
  });
  if (error) return { ok: false, message: authErrorMessage(error), values };

  // Email confirmation disabled in Supabase: the user is already signed in.
  if (data.session) redirect("/account");

  // Same message whether or not the email already exists (no account enumeration).
  return {
    ok: true,
    message: "تم استلام طلبك. إذا كان البريد صالحاً فستصلك رسالة تأكيد خلال دقائق. افتحها لتفعيل الحساب ثم سجّل الدخول.",
  };
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = normalizeEmail(formData.get("email"));
  const emailErr = validateEmail(email);
  if (emailErr) return { ok: false, fieldErrors: { email: emailErr }, values: { email } };

  if (!(await rateLimit("reset", 3, 60 * MIN, email))) {
    return { ok: false, message: TOO_MANY, values: { email } };
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
    return { ok: false, message: authErrorMessage(error), values: { email } };
  }

  return {
    ok: true,
    message: "إذا كان البريد مسجلاً لدينا فسنرسل إليه رابط استعادة كلمة المرور خلال دقائق.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const fieldErrors: Record<string, string> = {};
  const pwErr = validatePassword(password);
  if (pwErr) fieldErrors.password = pwErr;
  else if (password !== confirm) fieldErrors.confirm = "كلمتا المرور غير متطابقتين.";
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/forgot-password?error=link");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: authErrorMessage(error) };

  // Force a fresh sign-in everywhere after a password change.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?notice=password-updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

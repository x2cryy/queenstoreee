export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { ok: false };

export type AccountStatus = "active" | "blocked";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_path: string | null;
  created_at: string;
  account_status: AccountStatus;
};

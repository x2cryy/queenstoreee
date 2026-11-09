export type Freq = "weekly" | "biweekly" | "monthly";

export const FREQ_LABEL: Record<string, string> = {
  weekly: "أسبوعي",
  biweekly: "كل أسبوعين",
  monthly: "شهري",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Mirrors create_installment_plan: weekly/biweekly add days; monthly adds k months to the START
// date (not iteratively), clamping to the last day of the month (Jan 31 -> Feb 28 -> Mar 31).
export function dueDate(start: string, freq: Freq, k: number): string {
  const [y, m, day] = start.split("-").map(Number);
  if (freq === "weekly" || freq === "biweekly") {
    const d = new Date(Date.UTC(y, m - 1, day));
    d.setUTCDate(d.getUTCDate() + k * (freq === "weekly" ? 7 : 14));
    return iso(d);
  }
  const total = m - 1 + k;
  const yy = y + Math.floor(total / 12);
  const mm = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(yy, mm, Math.min(day, last))));
}

export type SchedulePreview = { seq: number; due: string; amount: number };

// The last installment absorbs the rounding remainder, exactly like the database function.
export function buildSchedule(total: number, down: number, count: number, start: string, freq: Freq): SchedulePreview[] {
  const fin = total - down;
  if (!Number.isInteger(count) || count < 1 || count > 360 || fin <= 0) return [];
  const base = Math.floor(fin / count);
  if (base <= 0) return [];
  const rows: SchedulePreview[] = [];
  for (let k = 1; k <= count; k++) {
    rows.push({ seq: k, due: dueDate(start, freq, k - 1), amount: k === count ? fin - base * (count - 1) : base });
  }
  return rows;
}

const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

export const todayISO = (now: number = Date.now()) =>
  new Date(now + TZ_OFFSET_MS).toISOString().slice(0, 10);

const MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function longDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

export function formatDate(iso: string) {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

const nf = new Intl.NumberFormat("en-US");
export const fmtNum = (n: number) => nf.format(Math.round(n));
// \u2066 ... \u2069 يعزل الرقم حتى لا ينقلب ترتيبه داخل النص العربي
export const fmtMoney = (n: number) => `\u2066${fmtNum(n)}\u2069 د.ع`;

// وقت الطلب بتوقيت بغداد: "اليوم 10:42 ص" أو "أمس 4:10 م" أو "5 تشرين الثاني"
export function orderTime(createdAt: string, now: number = Date.now()) {
  const t = Date.parse(createdAt) + TZ_OFFSET_MS;
  const d = new Date(t);
  const iso = d.toISOString().slice(0, 10);
  const today = todayISO(now);
  const yesterday = todayISO(now - 86_400_000);
  let h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const part = h >= 12 ? "م" : "ص";
  h = h % 12 || 12;
  const clock = `${h}:${m} ${part}`;
  if (iso === today) return `اليوم ${clock}`;
  if (iso === yesterday) return `أمس ${clock}`;
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

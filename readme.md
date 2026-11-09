# QUEEN STORE

متجر إلكتروني عراقي (Next.js + TypeScript + Tailwind + Supabase). عربي RTL، العملة IQD.

## التشغيل
1. `npm install`
2. انسخ `.env.example` إلى `.env.local` واملأ القيم.
3. `npm run dev` ثم افتح http://localhost:3000
4. للبناء: `npm run build`

## متغيرات البيئة
- `NEXT_PUBLIC_SUPABASE_URL` — رابط مشروع Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — المفتاح العام (anon) فقط

لا تضع Service Role Key في الواجهة أو في GitHub.

## Netlify
- Build command: `npm run build`
- أضف المتغيرين أعلاه من Site settings → Environment variables.
- Netlify يتعرف على Next.js تلقائياً.

## الهيكل
app، components، lib، hooks، types، public، supabase

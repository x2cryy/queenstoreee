# QUEEN STORE — المرحلة الثالثة (حزمة الملفات)

## التركيب (على Codespaces)
1. ارفع الملف المضغوط إلى جذر المشروع، ثم:
   unzip -o queen-phase3.zip && rm queen-phase3.zip
   npm install @supabase/ssr
2. في ملف .env.local تأكد من وجود (القيمتان عامتان وليستا سراً):
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   (أو NEXT_PUBLIC_SUPABASE_ANON_KEY)
   NEXT_PUBLIC_SITE_URL=https://عنوان-موقعك   (اختياري محلياً، مهم في الإنتاج)
   لا تضع service_role في أي متغير يبدأ بـ NEXT_PUBLIC. الحزمة لا تستخدمه أصلاً.
3. Supabase > SQL Editor: شغّل supabase/phase3/001_auth_profiles_permissions.sql مرة واحدة.
4. أنشئ حسابك من /register وأكّد بريدك، ثم شغّل 002_bootstrap_owner.sql يدوياً (الخطوة 1 فيه أولاً: قد تكون المالكة موجودة).
5. شغّل 003_verify_readonly.sql وأرسل لي الناتج، ثم 004_tests_rollback.sql وأرسل لي التقرير.
6. npx tsc --noEmit && npm run build

## إعدادات لوحة Supabase (تحقق منها بنفسك)
- Authentication > URL Configuration: Site URL = عنوان موقعك. Redirect URLs تتضمن <موقعك>/auth/callback
  (وعنوان Codespaces أثناء التجربة).
- Authentication > Providers > Email: Confirm email مفعّل (الكود يعمل في الحالتين).
- البريد الافتراضي من Supabase محدود جداً (عدد قليل في الساعة، ولعناوين فريق المنظمة فقط). للإنتاج اربط SMTP خاصاً.
- رابط استعادة كلمة المرور يجب أن يُفتح من نفس المتصفح الذي طُلب منه (PKCE).

## ما في الحزمة
proxy.ts (بدل middleware في Next 16) | lib/supabase/{env,server,browser,proxy}.ts
lib/auth/{session,validation,messages,rate-limit,site-url,permissions,staff-actions,types}.ts
app/(auth)/{login,register,forgot-password,reset-password,forbidden,session-expired} + actions.ts
app/account (الحساب) و app/account/profile (الملف الشخصي) و app/auth/callback
app/_styles/queen-auth.css (الألوان متغيرات CSS في أعلاه: بدّلها بألوان المشروع المعتمدة)

## ملاحظات
- lib/supabase/client.ts القديم (supabase-js) لا يشارك جلسة الـ cookies. للتصفح العام لا مشكلة،
  أما أي طلب من المتصفح يحتاج المستخدم المسجّل فاستخدم lib/supabase/browser.ts.
- لم أعدّل app/page.tsx ولا app/layout.tsx. أضف روابط /login و/account في الهيدر متى شئت.
- صورة الملف الشخصي (avatar_path) غير مبنية: أحتاج اسم الـ bucket وسياساته.
- واجهة إدارة المديرين من اختصاص المرحلة الرابعة. الدوال الخلفية جاهزة في lib/auth/staff-actions.ts.

import { getProfile, requireUser } from "../../../lib/auth/session";
import { ProfileForm } from "./profile-form";
import { AvatarForm } from "./avatar-form";

export const metadata = { title: "الملف الشخصي | QUEEN STORE" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const profile = await getProfile();
  return (
    <>
      <h1>الملف الشخصي</h1>
      <p className="q-lead">حدّث اسمك ورقم هاتفك. بياناتك لا تُعرض لغيرك.</p>
      <AvatarForm userId={user.id} avatarPath={profile?.avatar_path ?? null} />
      <ProfileForm
        email={user.email ?? ""}
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
      />
    </>
  );
}

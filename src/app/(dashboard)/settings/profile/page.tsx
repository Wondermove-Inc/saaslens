// src/app/(dashboard)/settings/profile/page.tsx
import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { ProfileForm } from "@/components/settings/profile-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = {
  title: "프로필 수정 | SaaS 관리 플랫폼",
  description: "개인 프로필 정보를 수정합니다",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      // jobTitle: true, // 주석 처리
      department: true,
      // avatarUrl: true, // 주석 처리
    },
  });

  return (
    <div className="space-y-4">
      <ProfileForm
        defaultValues={{
          name: user?.name || "",
          title: "",
          department: user?.department || "",
          avatarUrl: "",
        }}
        userEmail={session.user.email || undefined}
      />

      <DeleteAccountSection />
    </div>
  );
}

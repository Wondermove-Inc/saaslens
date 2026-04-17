// src/components/settings/profile-form.tsx
"use client";

import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Mail, User } from "lucide-react";
// MVP scope: avatar UI 비활성화 (backend에서 name만 처리)
// import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
// import {
//   AvatarPreviewGrid,
//   UserAvatar,
//   type AvatarVariant,
// } from "./user-avatar";

interface ProfileFormProps {
  defaultValues: {
    name: string;
    // MVP scope: avatar/title/department 비활성화
    title: string;
    department: string;
    avatarUrl: string;
  };
  userEmail?: string;
}

function SubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

// MVP scope: avatar 관련 유틸 비활성화
// function generateRandomSeed(): string {
//   return `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
// }
// function parseAvatarUrl(
//   url: string
// ): { variant: AvatarVariant; seed: string } | null {
//   if (!url || !url.startsWith("avatar://")) return null;
//   const [, rest] = url.split("://");
//   const [variant, seed] = rest?.split("/") ?? [];
//   if (!variant || !seed) return null;
//   return { variant: variant as AvatarVariant, seed };
// }

export function ProfileForm({ defaultValues, userEmail }: ProfileFormProps) {
  const t = useTranslations();
  const [state, formAction] = useActionState(updateProfile, {
    success: false,
  });

  // MVP scope: avatar 상태 비활성화
  // const parsedAvatar = parseAvatarUrl(defaultValues.avatarUrl);
  // const [avatarSeed, setAvatarSeed] = useState<string>(...);
  // const [selectedVariant, setSelectedVariant] = useState<AvatarVariant>(...);
  // const avatarValue = `avatar://${selectedVariant}/${avatarSeed}`;

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || t("settings.profile.toast.updated"));
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, t]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-lg p-2">
          <User className="text-primary h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-medium">{t("settings.profile.title")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("settings.profile.description")}
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        {/* MVP scope: 아바타 선택 섹션 비활성화 (backend에서 name만 처리) */}

        {/* Name Field - Editable Section */}
        <div className="hover:bg-purple-gray rounded-lg border p-4 transition-colors">
          <div className="space-y-0.5">
            <Label htmlFor="name">{t("settings.profile.fields.name")}</Label>
          </div>
          <Input
            id="name"
            name="name"
            defaultValue={defaultValues.name}
            required
            className="mt-2"
          />
          {state?.errors?.name && (
            <p className="text-destructive mt-1 text-sm">
              {state.errors.name.join(", ")}
            </p>
          )}
        </div>

        {/* Email Field - Info Notice Pattern (Read-only) */}
        {userEmail && (
          <div className="bg-muted flex items-start gap-3 rounded-lg p-4">
            <Mail className="text-muted-foreground mt-0.5 h-4 w-4" />
            <div className="flex-1">
              <Label htmlFor="email" className="text-muted-foreground">
                {t("settings.profile.fields.email")}
              </Label>
              <Input
                id="email"
                value={userEmail}
                disabled
                className="bg-muted/50 mt-2 cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {/* Department Field - Info Notice Pattern (Read-only) */}
        {defaultValues.department && (
          <div className="bg-muted flex items-start gap-3 rounded-lg p-4">
            <Building2 className="text-muted-foreground mt-0.5 h-4 w-4" />
            <div className="flex-1">
              <Label htmlFor="department" className="text-muted-foreground">
                {t("settings.profile.fields.department")}
              </Label>
              <Input
                id="department"
                value={defaultValues.department}
                disabled
                className="bg-muted/50 mt-2 cursor-not-allowed"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <SubmitButton
            idleLabel={t("settings.profile.actions.save")}
            pendingLabel={t("settings.profile.actions.saving")}
          />
        </div>
      </form>
    </div>
  );
}

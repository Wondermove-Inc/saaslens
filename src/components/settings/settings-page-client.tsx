"use client";

import { useGetIdentity } from "@refinedev/core";
import { Building2, Mail, Shield, User } from "lucide-react";
import { useTranslations } from "next-intl";

interface SettingsPageClientProps {
  fallbackUser: {
    id: string;
    email: string;
    name?: string | null;
    organizationId?: string | null;
    role?: string | null;
  };
}

export function SettingsPageClient({ fallbackUser }: SettingsPageClientProps) {
  const t = useTranslations();
  const { data: identity, isLoading } = useGetIdentity<typeof fallbackUser>({
    queryOptions: {
      enabled: true,
      initialData: fallbackUser,
    },
  });

  const user = identity ?? fallbackUser;

  const getRoleLabel = (role: string | null | undefined) => {
    switch (role) {
      case "ADMIN":
        return t("settings.roles.admin");
      case "MEMBER":
        return t("settings.roles.member");
      case "VIEWER":
        return t("settings.roles.viewer");
      default:
        return t("settings.roles.unknown");
    }
  };

  return (
    <div className="space-y-4" data-loading={isLoading ? "true" : "false"}>
      <div>
        <h3 className="text-lg font-medium">{t("settings.overview.title")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("settings.overview.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <User className="text-primary h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm leading-none font-medium">
              {t("settings.fields.name")}
            </p>
            <p className="text-muted-foreground text-sm">
              {user?.name || t("settings.fields.nameEmpty")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Mail className="text-primary h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm leading-none font-medium">
              {t("settings.fields.email")}
            </p>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Building2 className="text-primary h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm leading-none font-medium">
              {t("settings.fields.organizationId")}
            </p>
            <p className="text-muted-foreground font-mono text-sm">
              {user?.organizationId
                ? `${user.organizationId.slice(0, 8)}...`
                : t("settings.fields.organizationIdEmpty")}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Shield className="text-primary h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm leading-none font-medium">
              {t("settings.fields.role")}
            </p>
            <p className="text-muted-foreground text-sm">
              {getRoleLabel(user?.role)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

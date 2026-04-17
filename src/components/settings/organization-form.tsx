// src/components/settings/organization-form.tsx
"use client";

import { updateOrganization } from "@/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FEATURES } from "@/config/features";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

interface OrganizationFormProps {
  defaultValues: {
    name: string;
    domain: string;
    logoUrl: string;
    address: string;
  };
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

export function OrganizationForm({ defaultValues }: OrganizationFormProps) {
  const t = useTranslations();
  const [state, formAction] = useActionState(
    async (
      _prevState: {
        success: boolean;
        message?: string;
        errors?: Record<string, string[]>;
      },
      formData: FormData
    ) => {
      return updateOrganization(formData);
    },
    { success: false, message: "" }
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || t("settings.organization.toast.updated"));
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, t]);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("settings.organization.fields.name")}</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues.name}
          required
        />
        {state?.errors?.name && (
          <p className="text-destructive text-sm">
            {state.errors.name.join(", ")}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="domain">
          {t("settings.organization.fields.domain")}
        </Label>
        <Input
          id="domain"
          name="domain"
          defaultValue={defaultValues.domain}
          placeholder={t("settings.organization.fields.domainPlaceholder")}
        />
        {state?.errors?.domain && (
          <p className="text-destructive text-sm">
            {state.errors.domain.join(", ")}
          </p>
        )}
      </div>
      {FEATURES.ORGANIZATION_LOGO ? (
        <div className="space-y-2">
          <Label htmlFor="logoUrl">
            {t("settings.organization.fields.logo")}
          </Label>
          <Input
            id="logoUrl"
            name="logoUrl"
            defaultValue={defaultValues.logoUrl}
            placeholder={t("settings.organization.fields.logoPlaceholder")}
          />
          {state?.errors?.logoUrl && (
            <p className="text-destructive text-sm">
              {state.errors.logoUrl.join(", ")}
            </p>
          )}
        </div>
      ) : (
        <input type="hidden" name="logoUrl" value={defaultValues.logoUrl} />
      )}
      <div className="space-y-2">
        <Label htmlFor="address">
          {t("settings.organization.fields.address")}
        </Label>
        <Input
          id="address"
          name="address"
          defaultValue={defaultValues.address}
          placeholder={t("settings.organization.fields.addressPlaceholder")}
        />
        {state?.errors?.address && (
          <p className="text-destructive text-sm">
            {state.errors.address.join(", ")}
          </p>
        )}
      </div>
      <div className="flex justify-end pt-4">
        <SubmitButton
          idleLabel={t("settings.organization.actions.save")}
          pendingLabel={t("settings.organization.actions.saving")}
        />
      </div>
    </form>
  );
}

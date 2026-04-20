// src/app/(dashboard)/extension-guide/page.tsx
import {
  getExtensionDeploySettings,
  getLatestBuild,
} from "@/actions/extensions/builds";
import { ExtensionGuideContent } from "@/components/extensions/extension-guide-content";
import { requireOrganization } from "@/lib/auth/require-auth";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("extensions.extensionGuide");
  return {
    title: t("title"),
  };
}

export default async function ExtensionGuidePage() {
  await requireOrganization();

  const [settingsResult, latestBuildResult] = await Promise.all([
    getExtensionDeploySettings(),
    getLatestBuild(),
  ]);

  const deployMethod =
    settingsResult.success && settingsResult.data
      ? settingsResult.data.extensionDeployMethod
      : "manual";
  const webstoreUrl =
    settingsResult.success && settingsResult.data
      ? settingsResult.data.extensionWebstoreUrl
      : "";
  const latestBuild = latestBuildResult.success ? latestBuildResult.data : null;

  return (
    <ExtensionGuideContent
      deployMethod={deployMethod}
      webstoreUrl={webstoreUrl}
      latestBuildId={latestBuild?.id || null}
      latestBuildVersion={latestBuild?.version || null}
    />
  );
}

"use client";

import { Check, Copy, ExternalLink, Laptop, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FleetDMInstallGuideProps {
  /** Sheet 닫기 콜백 */
  onClose?: () => void;
}

/**
 * FleetDM 에이전트 설치 가이드 컴포넌트
 * OS별 설치 방법을 탭으로 제공합니다.
 */
export function FleetDMInstallGuide({ onClose }: FleetDMInstallGuideProps) {
  const t = useTranslations("devices.installGuide");
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = async (command: string, id: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(id);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const CopyButton = ({ command, id }: { command: string; id: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 shrink-0"
      onClick={() => copyToClipboard(command, id)}
    >
      {copiedCommand === id ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  const CommandBlock = ({ command, id }: { command: string; id: string }) => (
    <div className="bg-muted flex items-center justify-between gap-2 rounded-md p-3 font-mono text-sm">
      <code className="overflow-x-auto break-all whitespace-pre-wrap">
        {command}
      </code>
      <CopyButton command={command} id={id} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 py-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <Tabs defaultValue="macos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="macos" className="gap-2">
            <Laptop className="h-4 w-4" />
            {t("tabs.macos")}
          </TabsTrigger>
          <TabsTrigger value="windows" className="gap-2">
            <Monitor className="h-4 w-4" />
            {t("tabs.windows")}
          </TabsTrigger>
          <TabsTrigger value="linux" className="gap-2">
            <Monitor className="h-4 w-4" />
            {t("tabs.linux")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="macos" className="mt-4 space-y-4">
          <div>
            <h3 className="mb-2 font-medium">{t("macos.homebrewTitle")}</h3>
            <CommandBlock
              command="brew install --cask fleetd"
              id="macos-brew"
            />
          </div>
          <div>
            <h3 className="mb-2 font-medium">{t("macos.pkgTitle")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("macos.pkgDescription")}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="windows" className="mt-4 space-y-4">
          <div>
            <h3 className="mb-2 font-medium">{t("windows.installTitle")}</h3>
            <p className="text-muted-foreground mb-3 text-sm">
              {t("windows.step1")}
            </p>
            <p className="text-muted-foreground mb-3 text-sm">
              {t("windows.step2")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("windows.step3")}
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-medium">{t("windows.powershellTitle")}</h3>
            <CommandBlock
              command="winget install FleetDM.fleetd"
              id="windows-winget"
            />
          </div>
        </TabsContent>

        <TabsContent value="linux" className="mt-4 space-y-4">
          <div>
            <h3 className="mb-2 font-medium">{t("linux.debTitle")}</h3>
            <CommandBlock
              command="curl -L https://download.fleetdm.com/fleetd.deb -o fleetd.deb && sudo dpkg -i fleetd.deb"
              id="linux-deb"
            />
          </div>
          <div>
            <h3 className="mb-2 font-medium">{t("linux.rpmTitle")}</h3>
            <CommandBlock
              command="curl -L https://download.fleetdm.com/fleetd.rpm -o fleetd.rpm && sudo rpm -i fleetd.rpm"
              id="linux-rpm"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-4">
        <h3 className="mb-2 font-medium">{t("resources.title")}</h3>
        <a
          href="https://fleetdm.com/docs/get-started"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          {t("resources.link")}
        </a>
      </div>

      {onClose && (
        <div className="border-t pt-4">
          <Button variant="outline" onClick={onClose} className="w-full">
            {t("actions.close")}
          </Button>
        </div>
      )}
    </div>
  );
}

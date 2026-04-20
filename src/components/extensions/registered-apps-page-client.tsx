// src/components/extensions/registered-apps-page-client.tsx
"use client";

import {
  addManualRegisteredApp,
  getRegisteredApps,
  removeRegisteredApp,
  syncRegisteredAppsToWhitelist,
  toggleRegisteredAppStatus,
  type RegisteredAppItem,
} from "@/actions/extensions/registered-apps";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ExternalLink,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function RegisteredAppsPageClient() {
  const t = useTranslations("extensions");
  const [items, setItems] = useState<RegisteredAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ pattern: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<RegisteredAppItem | null>(
    null
  );

  async function fetchData() {
    setLoading(true);
    const result = await getRegisteredApps({ search });
    if (result.success && result.data) {
      setItems(result.data.items);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSync() {
    setSyncing(true);
    const result = await syncRegisteredAppsToWhitelist();
    if (result.success) {
      toast.success(result.message || t("registeredApps.syncComplete"));
      fetchData();
    } else {
      toast.error(result.error || t("registeredApps.syncFailed"));
    }
    setSyncing(false);
  }

  async function handleToggle(item: RegisteredAppItem) {
    const result = await toggleRegisteredAppStatus(item.appId, !item.isEnabled);
    if (result.success) {
      toast.success(result.message);
      fetchData();
    } else {
      toast.error(result.error || t("common.statusChangeFailed"));
    }
  }

  async function handleDelete(item: RegisteredAppItem) {
    const result = await removeRegisteredApp(item.pattern);
    if (result.success) {
      toast.success(t("common.deleted"));
      fetchData();
    } else {
      toast.error(result.error || t("common.deleteFailed"));
    }
    setDeleteConfirm(null);
  }

  async function handleSubmit() {
    setSaving(true);
    const result = await addManualRegisteredApp(formData);
    if (result.success) {
      toast.success(t("common.added"));
      fetchData();
      setDialogOpen(false);
      setFormData({ pattern: "", name: "" });
    } else {
      toast.error(result.error || t("common.addFailed"));
    }
    setSaving(false);
  }

  function handleSearch() {
    fetchData();
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={t("registeredApps.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            {t("common.search")}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            {t("registeredApps.syncButton")}
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("registeredApps.manualAddButton")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("registeredApps.addDialogTitle")}</DialogTitle>
                <DialogDescription>
                  {t("registeredApps.addDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t("registeredApps.appNameLabel")}
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("registeredApps.appNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pattern">
                    {t("registeredApps.patternLabel")}
                  </Label>
                  <Input
                    id="pattern"
                    value={formData.pattern}
                    onChange={(e) =>
                      setFormData({ ...formData, pattern: e.target.value })
                    }
                    placeholder={t("registeredApps.patternPlaceholder")}
                  />
                  <p className="text-muted-foreground text-xs">
                    {t("registeredApps.patternHint")}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? t("registeredApps.adding") : t("common.add")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">
                {t("registeredApps.emptyTitle")}
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                {t("registeredApps.emptyDescription")}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>
                    {t("registeredApps.tableHeaders.appName")}
                  </TableHead>
                  <TableHead>
                    {t("registeredApps.tableHeaders.urlPattern")}
                  </TableHead>
                  <TableHead>
                    {t("registeredApps.tableHeaders.category")}
                  </TableHead>
                  <TableHead>
                    {t("registeredApps.tableHeaders.source")}
                  </TableHead>
                  <TableHead className="w-[100px]">
                    {t("registeredApps.tableHeaders.enabled")}
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.logoUrl ? (
                        <Image
                          src={item.logoUrl}
                          alt={item.appName}
                          width={32}
                          height={32}
                          className="rounded"
                        />
                      ) : (
                        <div className="bg-purple-gray flex h-8 w-8 items-center justify-center rounded">
                          <span className="text-xs font-medium">
                            {item.appName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.appName}</span>
                        {item.website && (
                          <a
                            href={item.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.pattern}
                    </TableCell>
                    <TableCell>
                      {item.category && (
                        <Badge variant="outline">{item.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.source === "AUTO" ? "default" : "secondary"
                        }
                      >
                        {item.source === "AUTO"
                          ? t("common.auto")
                          : t("common.manual")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isEnabled}
                        onCheckedChange={() => handleToggle(item)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(item)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("registeredApps.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("registeredApps.confirmDelete", {
                name: deleteConfirm?.appName ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

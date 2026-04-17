// src/components/extensions/blacklist-page-client.tsx
"use client";

import {
  createBlacklist,
  deleteBlacklist,
  getBlacklists,
  updateBlacklist,
} from "@/actions/extensions";
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
import { Textarea } from "@/components/ui/textarea";
import type { ExtensionBlacklistItem } from "@/types/extension";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function BlacklistPageClient() {
  const t = useTranslations("extensions");
  const [items, setItems] = useState<ExtensionBlacklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExtensionBlacklistItem | null>(null);
  const [formData, setFormData] = useState({
    pattern: "",
    name: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] =
    useState<ExtensionBlacklistItem | null>(null);

  async function fetchData() {
    const result = await getBlacklists();
    if (result.success && result.data) {
      setItems(result.data.items);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreateDialog() {
    setEditItem(null);
    setFormData({ pattern: "", name: "", reason: "" });
    setDialogOpen(true);
  }

  function openEditDialog(item: ExtensionBlacklistItem) {
    setEditItem(item);
    setFormData({
      pattern: item.pattern,
      name: item.name,
      reason: item.reason || "",
    });
    setDialogOpen(true);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      if (editItem) {
        const result = await updateBlacklist(editItem.id, formData);
        if (result.success) {
          toast.success(t("common.updated"));
          fetchData();
          setDialogOpen(false);
        } else {
          toast.error(result.error || t("common.updateFailed"));
        }
      } else {
        const result = await createBlacklist(formData);
        if (result.success) {
          toast.success(t("common.added"));
          fetchData();
          setDialogOpen(false);
        } else {
          toast.error(result.error || t("common.addFailed"));
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: ExtensionBlacklistItem) {
    const result = await updateBlacklist(item.id, { enabled: !item.enabled });
    if (result.success) {
      toast.success(
        item.enabled ? t("common.deactivated") : t("common.activated")
      );
      fetchData();
    } else {
      toast.error(result.error || t("common.statusChangeFailed"));
    }
  }

  async function handleDelete(item: ExtensionBlacklistItem) {
    const result = await deleteBlacklist(item.id);
    if (result.success) {
      toast.success(t("common.deleted"));
      fetchData();
    } else {
      toast.error(result.error || t("common.deleteFailed"));
    }
    setDeleteConfirm(null);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              {t("common.add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editItem ? t("blacklist.editTitle") : t("blacklist.addTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("blacklist.dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pattern">{t("blacklist.patternLabel")}</Label>
                <Input
                  id="pattern"
                  value={formData.pattern}
                  onChange={(e) =>
                    setFormData({ ...formData, pattern: e.target.value })
                  }
                  placeholder="*.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t("blacklist.nameLabel")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("blacklist.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">{t("blacklist.reasonLabel")}</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder={t("blacklist.reasonPlaceholder")}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving
                  ? t("common.saving")
                  : editItem
                    ? t("common.edit")
                    : t("common.add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-muted-foreground">{t("common.noItems")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("blacklist.tableHeaders.name")}</TableHead>
                  <TableHead>{t("blacklist.tableHeaders.pattern")}</TableHead>
                  <TableHead>{t("blacklist.tableHeaders.reason")}</TableHead>
                  <TableHead>{t("blacklist.tableHeaders.status")}</TableHead>
                  <TableHead className="w-[100px]">
                    {t("blacklist.tableHeaders.enabled")}
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.pattern}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.reason || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.enabled ? "default" : "secondary"}>
                        {item.enabled
                          ? t("common.enabled")
                          : t("common.disabled")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.enabled}
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
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
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
              {t("common.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirmDelete", { name: deleteConfirm?.name ?? "" })}
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

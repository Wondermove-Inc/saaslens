// src/components/cards/card-register-form.tsx
"use client";

import { registerCorporateCard } from "@/actions/corporate-cards";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CARD_COMPANIES } from "@/lib/services/hyphen/types";
import { AlertCircle, CreditCard, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type LoginMethod = "ID" | "CERT";
type AssignmentType = "none" | "team" | "user";

interface TeamOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  teamName: string | null;
}

interface CardRegisterFormProps {
  onSuccess?: () => void;
  teams?: TeamOption[];
  users?: UserOption[];
}

export function CardRegisterForm({
  onSuccess,
  teams = [],
  users = [],
}: CardRegisterFormProps) {
  const t = useTranslations("cards.register");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("ID");

  // Form state
  const [cardCd, setCardCd] = useState("");
  const [cardNo, setCardNo] = useState("");
  const [cardNm, setCardNm] = useState("");
  const [userId, setUserId] = useState(""); // 카드사 로그인 ID
  const [userPw, setUserPw] = useState("");
  const [signCert, setSignCert] = useState("");
  const [signPri, setSignPri] = useState("");
  const [signPw, setSignPw] = useState("");
  const [bizNo, setBizNo] = useState("");

  // 배정 관련 상태
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("none");
  const [teamId, setTeamId] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  const resetForm = () => {
    setCardCd("");
    setCardNo("");
    setCardNm("");
    setUserId("");
    setUserPw("");
    setSignCert("");
    setSignPri("");
    setSignPw("");
    setBizNo("");
    setAssignmentType("none");
    setTeamId("");
    setAssignedUserId("");
    setLoginMethod("ID");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("cardCd", cardCd);
    formData.append("cardNo", cardNo.replace(/\s/g, ""));
    formData.append("cardNm", cardNm);
    formData.append("loginMethod", loginMethod);
    formData.append("bizNo", bizNo);

    // 배정 정보 (상호 배타: 팀 또는 유저 중 하나만)
    if (assignmentType === "team" && teamId) {
      formData.append("teamId", teamId);
    } else if (assignmentType === "user" && assignedUserId) {
      formData.append("assignedUserId", assignedUserId);
    }

    if (loginMethod === "ID") {
      formData.append("userId", userId);
      formData.append("userPw", userPw);
    } else {
      formData.append("signCert", signCert);
      formData.append("signPri", signPri);
      formData.append("signPw", signPw);
    }

    startTransition(async () => {
      const result = await registerCorporateCard(formData);

      if (result.success) {
        toast.success(t("success"));
        setOpen(false);
        resetForm();
        onSuccess?.();
      } else {
        setError(result.message || t("error"));
      }
    });
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(" ") : digits;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {t("dialogTitle")}
            </DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* 카드사 선택 */}
            <div className="grid gap-2">
              <Label htmlFor="cardCd">{t("cardCompany")} *</Label>
              <Select value={cardCd} onValueChange={setCardCd} required>
                <SelectTrigger>
                  <SelectValue placeholder={t("cardCompanyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CARD_COMPANIES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 카드번호 */}
            <div className="grid gap-2">
              <Label htmlFor="cardNo">{t("cardNumber")} *</Label>
              <Input
                id="cardNo"
                placeholder={t("cardNumberPlaceholder")}
                value={formatCardNumber(cardNo)}
                onChange={(e) => setCardNo(e.target.value.replace(/\s/g, ""))}
                maxLength={23}
                required
              />
            </div>

            {/* 카드 별명 */}
            <div className="grid gap-2">
              <Label htmlFor="cardNm">{t("cardNickname")}</Label>
              <Input
                id="cardNm"
                placeholder={t("cardNicknamePlaceholder")}
                value={cardNm}
                onChange={(e) => setCardNm(e.target.value)}
              />
            </div>

            {/* 사업자번호 */}
            <div className="grid gap-2">
              <Label htmlFor="bizNo">{t("businessNumber")}</Label>
              <Input
                id="bizNo"
                placeholder={t("businessNumberPlaceholder")}
                value={bizNo}
                onChange={(e) =>
                  setBizNo(e.target.value.replace(/[^0-9-]/g, ""))
                }
              />
            </div>

            {/* 카드 배정 유형 */}
            <div className="grid gap-2">
              <Label>{t("assignment")}</Label>
              <RadioGroup
                value={assignmentType}
                onValueChange={(v) => {
                  setAssignmentType(v as AssignmentType);
                  // 배정 유형 변경 시 선택 초기화
                  if (v !== "team") setTeamId("");
                  if (v !== "user") setAssignedUserId("");
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="assign-none" />
                  <Label htmlFor="assign-none" className="cursor-pointer">
                    {t("assignmentNone")}
                  </Label>
                </div>
                {teams.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="team" id="assign-team" />
                    <Label htmlFor="assign-team" className="cursor-pointer">
                      {t("assignmentTeam")}
                    </Label>
                  </div>
                )}
                {users.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="user" id="assign-user" />
                    <Label htmlFor="assign-user" className="cursor-pointer">
                      {t("assignmentUser")}
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </div>

            {/* 팀 선택 (팀 공용 선택 시) */}
            {assignmentType === "team" && teams.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="teamId">{t("assignTeam")} *</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("assignTeamPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 유저 선택 (개인 전용 선택 시) */}
            {assignmentType === "user" && users.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="assignedUserId">{t("assignUser")} *</Label>
                <Select
                  value={assignedUserId}
                  onValueChange={setAssignedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("assignUserPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span>{user.name || user.email}</span>
                          {user.teamName && (
                            <span className="text-muted-foreground text-xs">
                              {user.teamName}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 로그인 방식 선택 */}
            <div className="grid gap-2">
              <Label>{t("authMethod")} *</Label>
              <RadioGroup
                value={loginMethod}
                onValueChange={(v) => setLoginMethod(v as LoginMethod)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ID" id="login-id" />
                  <Label htmlFor="login-id" className="cursor-pointer">
                    {t("authMethodId")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CERT" id="login-cert" />
                  <Label htmlFor="login-cert" className="cursor-pointer">
                    {t("authMethodCert")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* ID 로그인 필드 */}
            {loginMethod === "ID" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="userId">{t("loginId")} *</Label>
                  <Input
                    id="userId"
                    placeholder={t("loginIdPlaceholder")}
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="userPw">{t("loginPassword")} *</Label>
                  <Input
                    id="userPw"
                    type="password"
                    placeholder={t("loginPasswordPlaceholder")}
                    value={userPw}
                    onChange={(e) => setUserPw(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* 인증서 로그인 필드 */}
            {loginMethod === "CERT" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="signCert">{t("cert")} *</Label>
                  <Textarea
                    id="signCert"
                    placeholder={t("certPlaceholder")}
                    value={signCert}
                    onChange={(e) => setSignCert(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signPri">{t("privateKey")} *</Label>
                  <Textarea
                    id="signPri"
                    placeholder={t("privateKeyPlaceholder")}
                    value={signPri}
                    onChange={(e) => setSignPri(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signPw">{t("certPassword")} *</Label>
                  <Input
                    id="signPw"
                    type="password"
                    placeholder={t("certPasswordPlaceholder")}
                    value={signPw}
                    onChange={(e) => setSignPw(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending || !cardCd || !cardNo}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("registering")}
                </>
              ) : (
                t("register")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// src/actions/notification-settings.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/logging";
import type { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export type NotificationField =
  | "renewalAlert30"
  | "renewalAlert60"
  | "renewalAlert90";

async function _updateNotificationSettings(
  subscriptionId: string,
  field: NotificationField,
  value: boolean
): Promise<ActionState> {
  try {
    const session = await auth();

    if (!session?.user) {
      return {
        success: false,
        message: "인증이 필요합니다",
      };
    }

    if (!session.user.organizationId) {
      return {
        success: false,
        message: "조직 정보가 필요합니다",
      };
    }

    // 구독 존재 및 조직 소속 확인
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        organizationId: session.user.organizationId,
      },
    });

    if (!subscription) {
      return {
        success: false,
        message: "구독을 찾을 수 없습니다",
      };
    }

    // 알림 설정 업데이트
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { [field]: value },
    });

    revalidatePath(`/subscriptions/${subscriptionId}`);

    return {
      success: true,
      message: "알림 설정이 업데이트되었습니다",
    };
  } catch (error) {
    logger.error({ err: error }, "알림 설정 업데이트 오류");
    return {
      success: false,
      message: "알림 설정 업데이트 중 오류가 발생했습니다",
    };
  }
}
export const updateNotificationSettings = withLogging(
  "updateNotificationSettings",
  _updateNotificationSettings
);

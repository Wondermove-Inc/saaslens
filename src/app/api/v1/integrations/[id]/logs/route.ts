import { NextResponse } from "next/server";

import { getSyncLogs } from "@/actions/integrations";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getSyncLogs(id, 20);

  if (!result.success) {
    const status =
      result.message === "연동을 찾을 수 없습니다"
        ? 404
        : result.message === "접근 권한이 없습니다"
          ? 403
          : 400;
    return NextResponse.json({ error: result.message }, { status });
  }

  return NextResponse.json({ logs: result.data?.logs ?? [] });
}

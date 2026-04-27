import type { NextRequest } from "next/server";

/** إن وُجد ZK_ICLOCK_COMM_KEY يجب أن يطابق query pushcommkey (كما يرسله جهاز ZK أحيانًا). */
export function iclockPushAuthorized(request: NextRequest): boolean {
  const expected = process.env.ZK_ICLOCK_COMM_KEY?.trim();
  if (!expected) return true;
  const url = request.nextUrl;
  const got = url.searchParams.get("pushcommkey") ?? url.searchParams.get("PushCommKey");
  return got === expected;
}

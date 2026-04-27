import type { NextRequest } from "next/server";
import { handleIclockPostAttlog } from "@/lib/iclock-http";

/** بعض أجهزة ZK ترسل سجل الحضور إلى `/iclock/edata` بدل `/iclock/cdata`. */
export async function POST(request: NextRequest) {
  return handleIclockPostAttlog(request);
}

import type { NextRequest } from "next/server";
import { handleIclockPostDevicecmd } from "@/lib/iclock-http";

export async function POST(request: NextRequest) {
  return handleIclockPostDevicecmd(request);
}

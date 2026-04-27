import type { NextRequest } from "next/server";
import { handleIclockGetRequest } from "@/lib/iclock-http";

export async function GET(request: NextRequest) {
  return handleIclockGetRequest(request);
}

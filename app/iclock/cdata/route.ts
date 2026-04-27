import type { NextRequest } from "next/server";
import { handleIclockGetCdata, handleIclockPostAttlog } from "@/lib/iclock-http";

export async function GET(request: NextRequest) {
  return handleIclockGetCdata(request);
}

export async function POST(request: NextRequest) {
  return handleIclockPostAttlog(request);
}

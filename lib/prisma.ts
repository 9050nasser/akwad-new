import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Bump when Prisma schema adds fields/relations that old cached clients reject (e.g. Employee.departmentGroup). */
const PRISMA_CLIENT_SCHEMA_STAMP = "employee-dept-2026-04";

function newPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  (client as unknown as { __prismaSchemaStamp: string }).__prismaSchemaStamp = PRISMA_CLIENT_SCHEMA_STAMP;
  return client;
}

/** Delegates the app expects from the current Prisma schema (payroll + related). */
const REQUIRED_PRISMA_DELEGATES = [
  "payrollVacation",
  "payrollManualDeduction",
  "payrollManualBonus",
] as const;

/**
 * In dev, Next/Turbopack can keep `globalThis.prisma` across edits while `prisma generate`
 * adds models — a cached client may miss any of those delegates until restart.
 */
function prismaClientMatchesGeneratedSchema(client: PrismaClient) {
  const c = client as unknown as Record<string, { findMany?: unknown } | undefined>;
  if (!REQUIRED_PRISMA_DELEGATES.every((key) => typeof c[key]?.findMany === "function")) {
    return false;
  }
  const stamp = (client as unknown as { __prismaSchemaStamp?: string }).__prismaSchemaStamp;
  return stamp === PRISMA_CLIENT_SCHEMA_STAMP;
}

const cached = globalForPrisma.prisma;
export const prisma =
  cached && prismaClientMatchesGeneratedSchema(cached)
    ? cached
    : (() => {
        if (cached) void cached.$disconnect();
        return newPrismaClient();
      })();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

#!/bin/bash
set -e
cd /home/frappe/akwad-new
DB=prisma/dev.db
if ! sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='BiometricTransfer';" | grep -q BiometricTransfer; then
  sqlite3 "$DB" <<'SQL'
CREATE TABLE "BiometricTransfer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "employeeName" TEXT NOT NULL,
  "pin" TEXT NOT NULL,
  "sourceDeviceId" TEXT NOT NULL,
  "sourceDeviceSn" TEXT NOT NULL,
  "includeFinger" INTEGER NOT NULL DEFAULT 1,
  "includeFace" INTEGER NOT NULL DEFAULT 1,
  "targetMode" TEXT NOT NULL,
  "targetDeviceSns" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'WAITING_DATA',
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "BiometricTransfer_companyId_createdAt_idx" ON "BiometricTransfer"("companyId", "createdAt");
CREATE INDEX "BiometricTransfer_sourceDeviceSn_pin_status_idx" ON "BiometricTransfer"("sourceDeviceSn", "pin", "status");
SQL
fi
if ! sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='BiometricTemplate';" | grep -q BiometricTemplate; then
  sqlite3 "$DB" <<'SQL'
CREATE TABLE "BiometricTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transferId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "fid" INTEGER NOT NULL DEFAULT 0,
  "command" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BiometricTemplate_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "BiometricTransfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BiometricTemplate_transferId_kind_fid_key" ON "BiometricTemplate"("transferId", "kind", "fid");
SQL
fi
sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Biometric%';"

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const devs = await prisma.fingerprintDevice.findMany();
  console.log(devs);
}
main().finally(() => prisma.$disconnect());

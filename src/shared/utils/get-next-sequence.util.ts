import { COUNTER_TYPE, Prisma } from "@prisma/client";

export async function getNextSequence(
  tx: Prisma.TransactionClient,
  companyId: string,
  type: COUNTER_TYPE,
): Promise<number> {
  const counter = await tx.companyCounter.upsert({
    where: { companyId_type: { companyId, type } },
    create: { companyId, type, value: 1 },
    update: { value: { increment: 1 } },
  });
  return counter.value;
}

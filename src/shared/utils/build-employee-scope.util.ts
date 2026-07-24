import { Prisma } from "@prisma/client";

export function buildEmployeeScopeFilter(
  isOwner: boolean,
  userId: string,
): Prisma.BookingWhereInput {
  return isOwner ? {} : { services: { some: { employeeId: userId } } };
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  "service:create",
  "service:update",
  "service:delete",
  "service-users:update",
  "service-locations:update",
  "service-category:create",
  "service-category:update",
  "service-category:delete",
  "service:avatar",

  "schedule:create",
  "schedule:all",
  "schedule:first",
  "schedule:update",
  "schedule:delete",

  "location:create",
  "locations:read",
  "location:read",
  "location:update",
  "location:users",
  "location:user",
  "location:delete",
  "location:services",

  "employee:invite",
  "employee/register",
  "employee:update",
  "employee:delete",
  "employee:schedule",
  "employees:read",
  "employee:change-password",

  "user-find:email",
  "user-check:location",

  "company-customer:create",
  "company-customers:read",
  "company-customer:read",
  "company-customer-bookings:read",
  "company-customer:check",
  "company:create",
  "company-logo:upload",
  "company:update",

  "booking:create",
  "bookings:read",
  "booking-detail:read",
  "booking-customer-detail:read",
  "order-customer-detail:read",
  "booking:update",
  "booking:status",
  "booking:delete",
  "bookings:write",

  "directory:employees",
  "directory:locations",
  "directory:services",
  "directory:location-employees",
  "directory:location-services",
  "directory:customers",
  "directory:employee-schedule",

  "orders:read",
  "order-detail:read",
  "orders:write",
  "orders:draft",
  "orders:cancel",
  "orders:refund",
  "orders:calculate",

  "invoice:download",
  "invoices:read",

  "transactions:write",
  "transactions:create",
  "transactions:delete",
  "transactions-category:create",
  "transactions-category:update",
  "transactions-category:write",
  "transactions-category:delete",
];

const employeePermissions = [
  "schedule:create",
  "schedule:all",
  "schedule:first",
  "schedule:update",

  "locations:read",
  "location:read",

  "employees:read",

  "company-customer:read",

  "booking:create",
  "bookings:read",
  "booking-detail:read",
  "booking:update",
  "booking:status",

  // test
  "directory:employees",
  "directory:locations",
  "directory:services",
  "directory:location-employees",
  "directory:location-services",

  "invoice:download",
];

const ROLE_PRESETS: Record<string, string[]> = {
  owner: permissions,
  employee: employeePermissions,
};

const main = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    const existingRoles = await prisma.role.findMany({
      select: { name: true },
    });
    const existingRoleNames = new Set(existingRoles.map((r) => r.name));

    const newRoles = Object.keys(ROLE_PRESETS).filter(
      (name) => !existingRoleNames.has(name),
    );

    if (newRoles.length > 0) {
      await prisma.role.createMany({
        data: newRoles.map((name) => ({ name })),
      });
      console.log(
        `✅ Added ${newRoles.length} new roles: ${newRoles.join(", ")}`,
      );
    } else {
      console.log(`ℹ️ No new roles to add`);
    }

    const existingPermissions = await prisma.permission.findMany({
      select: { name: true },
    });
    const existingPermissionNames = new Set(
      existingPermissions.map((p) => p.name),
    );

    const newPermissions = permissions.filter(
      (name) => !existingPermissionNames.has(name),
    );

    if (newPermissions.length > 0) {
      await prisma.permission.createMany({
        data: newPermissions.map((name) => ({ name })),
      });
      console.log(
        `✅ Added ${newPermissions.length} new permissions: ${newPermissions.join(", ")}`,
      );
    } else {
      console.log(`ℹ️ No new permissions to add`);
    }

    const allRoles = await prisma.role.findMany({
      include: { permissions: true },
    });
    const allPermissions = await prisma.permission.findMany();

    const permissionMap = new Map(
      allPermissions.map((perm) => [perm.name, perm.id]),
    );

    for (const role of allRoles) {
      const preset = ROLE_PRESETS[role.name];
      if (!preset) continue;

      const currentPermissionNames = new Set(
        role.permissions.map((p) => p.name),
      );
      const newPermissionsForRole = preset.filter(
        (perm) => !currentPermissionNames.has(perm),
      );

      if (newPermissionsForRole.length > 0) {
        await prisma.role.update({
          where: { id: role.id },
          data: {
            permissions: {
              connect: newPermissionsForRole.map((perm) => ({
                id: permissionMap.get(perm)!,
              })),
            },
          },
        });
        console.log(
          `✅ Added ${newPermissionsForRole.length} new permissions to role "${role.name}": ${newPermissionsForRole.join(", ")}`,
        );
      } else {
        console.log(`ℹ️ No new permissions for role "${role.name}"`);
      }
    }

    console.log("🚀 Database seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    throw new Error(err instanceof Error ? err.message : String(err));
  }
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

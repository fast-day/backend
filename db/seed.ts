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
];

const ROLE_PRESETS: Record<string, string[]> = {
  owner: permissions,
  employee: employeePermissions,
};

const specializations = [
  {
    name: "Красота",
    tag: "beauty",
    description:
      "Для салонов красоты, парикмахерских и косметологических служб.",
    icon: "http://localhost:8080/v1/assets/specialization/specialization-services.svg",
    industries: [
      "Парикмахерская",
      "Салон красоты",
      "Студия эпиляции",
      "Электроэпиляция",
      "Салон лазерной эпиляции",
      "Массажная студия",
      "Маникюрный салон",
      "Спа-салон",
      "Студия загара",
      "Тату-салон",
    ],
  },
  {
    name: "Спорт",
    tag: "sport",
    description: "Для тренажерных залов, студий йоги и фитнес-центров.",
    icon: "http://localhost:8080/v1/assets/specialization/specialization-sport.svg",
    industries: [
      "Аэройога",
      "Центр кроссфита",
      "Танцевальная студия",
      "Фитнес-центр",
      "Гольф-клуб",
      "Тренажерный зал",
      "Персональный тренер",
      "Школа катания на роликах",
      "Спортивный центр",
      "Спортивный клуб",
      "Студия растяжки",
      "Студия йоги",
      "Теннисный корт",
    ],
  },
  {
    name: "Услуги",
    tag: "services",
    description: "Для тренажерных залов, студий йоги и фитнес-центров.",
    icon: "http://localhost:8080/v1/assets/specialization/specialization-services.svg",
    industries: [
      "Бизнес-консалтинг",
      "Уборка",
      "Юридический центр",
      "Юридическая консультация",
      "Нотариус",
      "Фотограф",
      "Агентство недвижимости",
      "Студия звукозаписи",
      "Ремонтная мастерская",
      "Свадебный салон",
      "Видеостудия",
    ],
  },
  {
    name: "Развлечение",
    tag: "entertainment",
    description:
      "Для клубов виртуальной реальности, комнат отдыха и других мероприятий.",
    icon: "http://localhost:8080/v1/assets/specialization/specialization-entertainment.svg",
    industries: [
      "Антистрессовая комната",
      "Прыжки с парашютом в помещении",
      "Баня",
      "Сауна",
      "Бильярд",
      "Боулинг",
      "Центр скалолазания",
      "Картинг",
      "Пейнтбол",
      "Лазертаг",
      "Игровой центр",
      "Бассейн",
      "Квест",
      "Зона отдыха",
      "VR Клуб",
      "Компьютерный клуб",
    ],
  },
  {
    name: "Животные",
    tag: "animals",
    description:
      "Для ветеринарных клиник, груминговых салонов и служб по уходу за домашними животными.",
    icon: "http://localhost:8080/v1/assets/specialization/specialization-animals.svg",
    industries: [
      "Дрессировка животных",
      "Зоосалон",
      "Ветеринарная клиника",
      "Другое",
    ],
  },
  {
    name: "Аренда",
    tag: "rent",
    description: "Для фотостудий, коворкингов и мест проведения мероприятий.",
    icon: "http://localhost:8080/v1/assets/specialization/specialization-rent.svg",
    industries: [
      "Банкетный зал",
      "Коворкинг",
      "Творческое пространство",
      "Чердак",
      "Подвал",
      "Офис",
      "Аренда",
      "Выставочный зал",
      "Другое",
    ],
  },
  {
    name: "Авто",
    tag: "auto",
    description: "Для автосервисов, автосалонов и моечных станций.",
    icon: "http://localhost:8080/v1/assets/specialization/specialization-auto.svg",
    industries: [
      "Автосервис",
      "Автосалон",
      "Автомойка",
      "Станция технического обслуживания",
      "Тюнинг-мастерская",
      "Шиномонтаж",
      "Другое",
    ],
  },
];

const main = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    for (const spec of specializations) {
      const specialization = await prisma.specialization.upsert({
        where: { name: spec.name },
        update: {
          description: spec.description,
          tag: spec.tag,
          icon: spec.icon,
        },
        create: {
          name: spec.name,
          tag: spec.tag,
          description: spec.description,
          icon: spec.icon,
        },
      });

      const existingIndustries = await prisma.industry.findMany({
        where: { specializationId: specialization.id },
        select: { name: true },
      });

      const existingIndustryNames = new Set(
        existingIndustries.map((i) => i.name),
      );
      const newIndustries = spec.industries.filter(
        (name: string) => !existingIndustryNames.has(name),
      );

      if (newIndustries.length > 0) {
        await prisma.industry.createMany({
          data: newIndustries.map((name: string) => ({
            name,
            specializationId: specialization.id,
          })),
        });
        console.log(
          `✅ Added ${newIndustries.length} new industries to "${spec.name}"`,
        );
      } else {
        console.log(`ℹ️ No new industries for "${spec.name}"`);
      }
    }

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

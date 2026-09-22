/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

/**
 * Seed hanya berisi akun login. Data pemantauan peatland saat ini
 * dilayani dari lib/peatland/mock-data.ts, bukan dari database.
 */
async function main() {
  const roles = [
    { name: "Admin", access: "all" },
    { name: "Operator", access: "operate" },
    { name: "Viewer", access: "read" },
  ];

  const users = [
    { username: "admin", name: "Administrator", email: "admin@peatland.local", password: "admin123", role: "Admin" },
    { username: "operator", name: "Operator Lapangan", email: "operator@peatland.local", password: "operator123", role: "Operator" },
    { username: "viewer", name: "Pengamat", email: "viewer@peatland.local", password: "viewer123", role: "Viewer" },
  ];

  const roleByName = new Map();
  for (const role of roles) {
    roleByName.set(
      role.name,
      await prisma.role.upsert({
        where: { name: role.name },
        update: { access: role.access },
        create: role,
      }),
    );
  }

  for (const user of users) {
    const data = {
      name: user.name,
      email: user.email,
      passwordHash: bcrypt.hashSync(user.password, 8),
      roleId: roleByName.get(user.role).id,
    };
    await prisma.user.upsert({
      where: { username: user.username },
      update: data,
      create: { username: user.username, ...data },
    });
  }

  console.log(`Seed selesai: ${roles.length} role, ${users.length} user.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

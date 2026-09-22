/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

/**
 * Seed hanya membuat peran dan satu akun administrator. Passwordnya diambil
 * dari env `ADMIN_PASSWORD` — sengaja tidak ditanam di repo, dan tidak
 * dilewatkan sebagai argumen perintah agar tidak terbaca di /proc/<pid>/cmdline.
 *
 * Data pemantauan dilayani dari lib/peatland/mock-data.ts, bukan database.
 */
async function main() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD belum diset. Jalankan lewat berkas env, mis: `set -a; . ./.env.seed; set +a; npm run db:seed`",
    );
  }

  const roles = [
    { name: "Admin", access: "all" },
    { name: "Operator", access: "operate" },
    { name: "Viewer", access: "read" },
  ];

  let adminRoleId = null;
  for (const role of roles) {
    const saved = await prisma.role.upsert({
      where: { name: role.name },
      update: { access: role.access },
      create: role,
    });
    if (role.name === "Admin") adminRoleId = saved.id;
  }

  const data = {
    name: "Administrator",
    email: "admin@beacon-engineering.id",
    passwordHash: bcrypt.hashSync(password, 10),
    roleId: adminRoleId,
  };

  await prisma.user.upsert({
    where: { username: "admin" },
    update: data,
    create: { username: "admin", ...data },
  });

  console.log(`Seed selesai: ${roles.length} peran, akun 'admin' siap.`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

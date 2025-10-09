import { prisma } from "db";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@teoram.app";
  const password = "SuperSecret123";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "ADMIN",
      active: true,
      name: "Admin",
    },
  });

  console.log("✅ Admin user created:", user.email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

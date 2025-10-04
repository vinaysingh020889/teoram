import "dotenv/config";
import { prisma } from "db";
import bcrypt from "bcryptjs";

async function main() {
  const email = "admin@teoram.app";
  const pass = "SuperSecret123";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log("Admin already exists:", email);
    return;
  }
  const hash = await bcrypt.hash(pass, 10);
  await prisma.user.create({
    data: { email, passwordHash: hash, role: "ADMIN", name: "Admin" },
  });
  console.log("✅ Admin created:", email, "/", pass);
}
main().finally(() => process.exit(0));

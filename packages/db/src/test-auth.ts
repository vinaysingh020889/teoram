import "dotenv/config";
import { prisma } from "./index.js";
import { createUser, login } from "./auth.js";

async function main() {
  // delete if exists (for repeatable test)
  await prisma.user.deleteMany({ where: { email: "test@example.com" } });

  const user = await createUser("test@example.com", "secret123");
  console.log("User created:", user);

  const result = await login("test@example.com", "secret123");
  console.log("Login result:", result);
}

main().finally(() => prisma.$disconnect());

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./index.js";

export async function createUser(
  email: string,
  password: string,
  role: "ADMIN" | "EDITOR" | "ANALYST" = "EDITOR"
) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.create({ data: { email, passwordHash, role } });
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
  return { token, user };
}

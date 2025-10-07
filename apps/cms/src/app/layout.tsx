//apps/cms/src/app/layout.tsx
import "../styles/globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="cms">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

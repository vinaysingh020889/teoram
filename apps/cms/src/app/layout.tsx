import "../styles/globals.css";
import { ReactNode } from "react";
import { AuthProvider } from "../lib/auth";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="cms">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

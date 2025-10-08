import type { Metadata } from "next";
import Script from "next/script"; // ✅ add this import
import "./styles/globals.css";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export const metadata: Metadata = {
  metadataBase: new URL("https://teoram.com"),
  title: {
    default: "TEORAM - Technology News & Insights",
    template: "%s | TEORAM",
  },
  description:
    "Stay updated with AI, gadgets, computing, and the future of technology. TEORAM brings you expert news, analysis, and insights.",
  openGraph: {
    title: "TEORAM - Technology News & Insights",
    description:
      "Discover the latest in artificial intelligence, gadgets, computing, and science.",
    url: "https://teoram.com",
    siteName: "TEORAM",
    images: [
      {
        url: "/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "TEORAM Tech News",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TEORAM - Technology News & Insights",
    description: "Explore AI, gadgets, and futuristic tech news with TEORAM.",
    images: ["/og-default.jpg"],
    creator: "@teoram",
  },
  alternates: {
    canonical: "https://teoram.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics (gtag.js) */}
        <Script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-QX4VKGZ2EV"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-QX4VKGZ2EV', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className="cms-shell">
        <Sidebar />
        <div className="cms-main">
          <Topbar />
          <div className="cms-content">{children}</div>
        </div>
      </body>
    </html>
  );
}

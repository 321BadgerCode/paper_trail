import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Trail | Automated Expense & Invoice Auditor",
  description:
    "AI-powered expense intelligence for invoice auditing and compliance.",
  applicationName: "Paper Trail",
  keywords: [
    "invoice",
    "audit",
    "expense",
    "compliance",
    "finance",
    "procurement",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Paper Trail",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

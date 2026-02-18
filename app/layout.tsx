import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audience Lab - B2B Visitor Intelligence",
  description: "Identify and track your B2B website visitors in real-time",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { AssistantWidget } from "@/components/AssistantWidget";

export const metadata: Metadata = {
  title: "Find Your Spot — College hall booking",
  description:
    "Helwan National University — Team 21. Hourly hall booking with admin approval, filters, and AI assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen">
        {children}
        <AssistantWidget />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AssistantWidget } from "@/components/AssistantWidget";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
      <body className={`${dmSans.variable} ${jetbrains.variable} font-sans antialiased min-h-screen`}>
        {children}
        <AssistantWidget />
      </body>
    </html>
  );
}

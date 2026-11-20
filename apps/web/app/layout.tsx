import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono, Oxanium } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { RouteThemeProvider as ThemeProvider } from "@/components/providers/route-theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

const oxanium = Oxanium({subsets:['latin'],variable:'--font-sans'});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShipFlow AI — From idea to shipped feature",
  description:
    "Clarify requests, write requirements, plan tasks, review code against your plan, and get human approval before you ship.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, fraunces.variable, "font-sans", oxanium.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <ThemeProvider defaultTheme="dark">
        {children}
        <Toaster/>
        </ThemeProvider>
        </QueryProvider>
        </body>
    </html>
  );
}
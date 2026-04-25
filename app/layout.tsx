import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppToaster } from "@/components/app-toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Radar",
  description: "Project planning and tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-2.5 backdrop-blur-sm supports-backdrop-filter:bg-background/70">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-foreground hover:underline"
            >
              Radar
            </Link>
            <ThemeToggle />
          </header>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

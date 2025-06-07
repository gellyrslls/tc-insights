import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AuthButton from "@/components/auth/AuthButton";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner"; // <-- Import Toaster

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Meta Insights Platform",
  description: "Performance analysis for Today's Carolinian",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased flex flex-col",
          inter.variable
        )}
      >
        {/* ... Header ... */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between">
            <Link href="/" className="font-bold mr-4">
              Meta Insights
            </Link>
            <div className="ml-auto">
              <AuthButton />
            </div>
          </div>
        </header>
        <main className="flex-1 container py-6">{children}</main>
        {/* ... Footer ... */}
        <footer className="py-4 md:px-8 md:py-0 border-t mt-auto bg-muted/50">
          <div className="container flex flex-col items-center justify-center h-12">
            <p className="text-xs text-muted-foreground">
              Today&apos;s Carolinian Meta Insights Platform
            </p>
          </div>
        </footer>
        <Toaster /> {/* <-- Add Toaster here */}
      </body>
    </html>
  );
}

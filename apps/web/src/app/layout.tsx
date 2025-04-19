import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AuthButton from "@/components/auth/AuthButton"; // Import the AuthButton
import Link from "next/link"; // Import Link for the title

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Meta Insights Platform",
  description: "Performance analysis for Today's Carolinian",
};

// Make the layout an async component to use await for AuthButton
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
          "min-h-screen bg-background font-sans antialiased flex flex-col", // Added flex flex-col
          inter.variable
        )}
      >
        {/* --- Header --- */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center justify-between">
             {/* Left side - App Name/Logo */}
             <Link href="/" className="font-bold mr-4">Meta Insights</Link>
             {/* Right side - Auth Button */}
             <div className="ml-auto"> {/* Push auth button to the right */}
                <AuthButton />
             </div>
          </div>
        </header>

        {/* --- Main Content --- */}
        <main className="flex-1 container py-6"> {/* flex-1 makes main content take available space */}
          {children}
        </main>

         {/* --- Footer --- */}
         <footer className="py-4 md:px-8 md:py-0 border-t mt-auto bg-muted/50"> {/* mt-auto pushes footer down, added subtle background */}
          <div className="container flex flex-col items-center justify-center h-12"> {/* Adjusted height */}
             <p className="text-xs text-muted-foreground">Today&apos;s Carolinian Meta Insights Platform</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
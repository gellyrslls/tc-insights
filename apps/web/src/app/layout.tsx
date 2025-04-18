import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Ensure globals.css (with Tailwind/ShadCN styles) is imported
import { cn } from "@/lib/utils"; // Import the ShadCN utility function

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Meta Insights Platform",
  description: "Performance analysis for Today's Carolinian",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head /> {/* You can add specific head tags here if needed */}
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased", // Basic ShadCN theme classes
          inter.variable
        )}
      >
        {/* Placeholder for a potential Header/Navbar later */}
        {/* <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            NAVBAR CONTENT
          </div>
        </header> */}
        <main className="flex-1 container py-4"> {/* Add padding/container */}
          {children} {/* Your page content will be rendered here */}
        </main>
        {/* Placeholder for a potential Footer later */}
        {/* <footer className="py-6 md:px-8 md:py-0 border-t">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            FOOTER CONTENT
          </div>
        </footer> */}
      </body>
    </html>
  );
}
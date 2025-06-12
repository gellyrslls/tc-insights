import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import Link from "next/link";

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const reason = resolvedSearchParams?.reason ?? "unknown";

  const title = "Access Denied";
  let description = "You don't have permission to access this application.";

  if (reason === "domain") {
    description =
      "Access is restricted to authorized users with a @usc.edu.ph email address.";
  } else if (reason === "whitelist") {
    description =
      "Your @usc.edu.ph account is not authorized for this application.";
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-tc-red flex items-center justify-center text-white font-bold text-xl">
              TC
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TC Insights</h1>
              <p className="text-sm text-gray-600">Today&apos;s Carolinian</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-tc-red/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-12 h-12 text-tc-red" />
            </div>
            <h1 className="text-4xl font-bold text-tc-red mb-4">{title}</h1>
            <p className="text-lg text-gray-600 mb-8">{description}</p>
          </div>

          <Alert className="border-tc-red bg-tc-red/5 mb-8">
            <Shield className="h-4 w-4 text-tc-red" />
            <AlertDescription className="text-gray-700">
              Access is restricted to authorized Online Managers and Editors. If
              you believe you should have access, contact him.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link href="https://www.instagram.com/reel/DJ6YcZ-zMsw/">
                piece 😭✌️
              </Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-tc-red text-white mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center">
            © 2025 Today&apos;s Carolinian. Internal use only.
          </p>
        </div>
      </footer>
    </div>
  );
}

import Link from 'next/link';
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
      <p className="mb-6">
        Something went wrong during the authentication process. Please try signing in again.
      </p>
      <Button asChild>
        <Link href="/">Go to Homepage</Link>
      </Button>
    </div>
  );
}
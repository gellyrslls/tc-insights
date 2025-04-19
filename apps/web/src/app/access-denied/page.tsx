import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SignOutButton from '@/components/auth/SignOutButton';

// Use the standard Next.js Page props structure
interface AccessDeniedPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  // Access the specific param directly from the destructured prop
  // Ensure it handles potential string[] case if needed, though 'reason' is likely string
  const reasonParam = searchParams?.reason;
  const reason = Array.isArray(reasonParam) ? reasonParam[0] : reasonParam ?? 'unknown';

  let message = 'You do not have permission to access the requested page.';
  let showSignOut = true;

  if (reason === 'domain') {
    message = 'Access denied. Please ensure you are logged in with your authorized @usc.edu.ph Google account.';
  } else if (reason === 'whitelist') {
    message = 'Your @usc.edu.ph account is not authorized to use this application. Please contact the site administrator if you believe this is an error.';
  } else if (reason === 'unknown') {
    // showSignOut = false; // Optional: hide sign out if reason is unknown
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center px-4">
      <h1 className="text-3xl font-bold mb-4 text-destructive">Access Denied</h1>
      <p className="mb-6 max-w-md">{message}</p>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/">Go to Homepage</Link>
        </Button>
        {showSignOut && <SignOutButton />}
      </div>
    </div>
  );
}
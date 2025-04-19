import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SignOutButton from '@/components/auth/SignOutButton';

// Define the props type matching the internal PageProps structure
type AccessDeniedPageProps = {
  // Use a more specific type for params, even if wrapped in Promise
  params: Promise<{ [key: string]: string | string[] | undefined }>; // More specific than Promise<any>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AccessDeniedPage({
  params,
  searchParams,
}: AccessDeniedPageProps) {

  const resolvedSearchParams = await searchParams; // Await searchParams
  const reasonParam = resolvedSearchParams?.reason;
  const reason = Array.isArray(reasonParam) ? reasonParam[0] : reasonParam ?? 'unknown';

  let message = 'You do not have permission to access the requested page.';
  const showSignOut = true;

  // Use params trivially to satisfy lint if needed
  // We might need to await params here too if the type check below fails
  const resolvedParams = await params;
  if (resolvedParams) { /* Using resolvedParams to satisfy lint */ }

  if (reason === 'domain') {
    message = 'Access denied. Please ensure you are logged in with your authorized @usc.edu.ph Google account.';
  } else if (reason === 'whitelist') {
    message = 'Your @usc.edu.ph account is not authorized to use this application. Please contact the site administrator if you believe this is an error.';
  } else if (reason === 'unknown') {
    // showSignOut = false;
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
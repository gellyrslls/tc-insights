import DashboardClient from './DashboardClient';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// This is a server component (default in Next.js App Router)
export default async function DashboardPage() {
  const supabase = createClient();
  
  // Server-side auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('Dashboard Page: No user found, redirecting to /.');
    redirect('/');
  }

  // If we reach here, middleware has already confirmed authentication AND authorization
  console.log(`Dashboard Page: Rendering for authorized user ${user.email}`);

  // Pass authenticated user info to the client component if needed
  return (
    <DashboardClient/>
  );
}
import { createClient } from '@/lib/supabase/server'; // Use server client
import { redirect } from 'next/navigation';
// No need for isUserAllowed check here, middleware handles it.

export default async function DashboardPage() {
  const supabase = createClient(); // Get server client for the request

  // Primary check: Is the user logged in? Middleware should have already run.
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If middleware somehow failed or there's an auth error, redirect.
  if (authError || !user) {
    console.log('Dashboard Page: No user found, redirecting to /.');
    redirect('/'); // Redirect to home page if not logged in
  }

  // If we reach here, middleware has already confirmed authentication AND authorization.
  console.log(`Dashboard Page: Rendering for authorized user ${user.email}`);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Protected Dashboard</h1>
      <p className="mb-2">Welcome, {user.email}!</p>
      <p>If you can see this page, you were successfully authenticated via Google, your email domain is `@usc.edu.ph`, and your specific email is whitelisted in the `allowed_users` table.</p>
      <p className="mt-4">This content is only visible to authorized users.</p>
      {/* Add actual dashboard content here later */}
    </div>
  );
}
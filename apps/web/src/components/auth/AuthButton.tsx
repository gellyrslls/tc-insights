import { createClient } from '@/lib/supabase/server'; // Use server client to check initial state
import SignInButton from './SignInButton';
import SignOutButton from './SignOutButton';
import Link from 'next/link';
import { Button } from '../ui/button'; // Import the manually added button

// This needs to be an async component to await getUser()
export default async function AuthButton() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Log user state for debugging
  // console.log('AuthButton - User:', user ? user.email : 'Not logged in');

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm hidden sm:inline">Hey, {user.email}!</span>
      {/* Optional: Link to dashboard if logged in */}
      <Button asChild variant="ghost" size="sm">
         <Link href="/dashboard">Dashboard</Link>
      </Button>
      <SignOutButton />
    </div>
  ) : (
    <SignInButton />
  );
}
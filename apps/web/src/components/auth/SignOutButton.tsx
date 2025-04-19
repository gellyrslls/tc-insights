'use client'; // This component needs client-side interaction and router

import { Button } from '@/components/ui/button'; // Import the manually added button
import { createClient } from '@/lib/supabase/client'; // Use the client-side utility
import { useRouter } from 'next/navigation'; // Use App Router's router

export default function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    console.log('Attempting Sign Out...');
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error logging out:', error.message);
      // TODO: Show user-friendly error message
    } else {
      console.log('Sign out successful. Refreshing router...');
      // Refresh the page to reflect the logged-out state in Server Components
      router.push('/'); // Redirect to home page first
      router.refresh(); // Force refresh of Server Components
    }
  };

  return <Button onClick={handleLogout} variant="outline">Sign Out</Button>;
}
'use client'; // This component needs client-side interaction for onClick

import { Button } from '@/components/ui/button'; // Import the manually added button
import { createClient } from '@/lib/supabase/client'; // Use the client-side utility

export default function SignInButton() {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    console.log('Attempting Google Sign In...');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect back to the same page or dashboard after login
        // The callback route will handle the session exchange
        redirectTo: `${window.location.origin}/auth/callback`,
        // Optional: Add scopes if needed later for Google API access
        // scopes: 'email profile https://www.googleapis.com/auth/...',
      },
    });

    if (error) {
      console.error('Error logging in with Google:', error.message);
      // TODO: Show user-friendly error message (e.g., using a Toast)
    } else {
      console.log('Redirecting to Google for authentication...');
      // User will be redirected by Supabase/Browser
    }
  };

  return <Button onClick={handleGoogleLogin}>Sign In with Google</Button>;
}

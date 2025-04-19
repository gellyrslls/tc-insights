import { createClient } from '@/lib/supabase/server'; // Use the server client utility
import { isUserAllowed } from '@/lib/authUtils'; // Import the helper
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/'; // Default redirect to homepage

  if (code) {
    const cookieStore = cookies();
    const supabase = createClient();

    // Exchange code for session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError.message);
      return NextResponse.redirect(`${origin}/auth/auth-error`);
    }

    // --- Authorization Checks ---
    // Get the user associated with the new session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      console.error('Callback: Error getting user after session exchange or email missing.');
      await supabase.auth.signOut(); // Clean up potentially partial session
      return NextResponse.redirect(`${origin}/auth/auth-error`);
    }

    // 1. Domain Check
    if (!user.email.endsWith('@usc.edu.ph')) {
      console.log(`Callback: User ${user.email} denied access (Invalid Domain). Logging out.`);
      await supabase.auth.signOut(); // Log out the user immediately
      return NextResponse.redirect(`${origin}/access-denied?reason=domain`);
    }

    // 2. Whitelist Check
    const allowed = await isUserAllowed(user.email, supabase);
    if (!allowed) {
      console.log(`Callback: User ${user.email} denied access (Not Whitelisted). Logging out.`);
      await supabase.auth.signOut(); // Log out the user immediately
      return NextResponse.redirect(`${origin}/access-denied?reason=whitelist`);
    }

    // --- If all checks pass ---
    console.log(`Callback: User ${user.email} successfully authenticated and authorized. Redirecting to: ${origin}${next}`);
    return NextResponse.redirect(`${origin}${next}`);

  } else {
    console.error('Callback: No code found in request.');
  }

  // Fallback redirect if no code or other errors occurred before checks
  return NextResponse.redirect(`${origin}/auth/auth-error`);
}
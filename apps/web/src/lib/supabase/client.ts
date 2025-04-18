import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

// Create and export the Supabase client
// We use the Anon key here, suitable for client-side and basic server-side operations.
// For operations requiring admin privileges (like bypassing RLS in API routes),
// you might create a separate admin client using the Service Role Key later.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Note: For Authentication with Next.js App Router, you'll likely use
// Supabase's Auth Helpers (@supabase/auth-helpers-nextjs) which provide
// specialized createClient functions for server components, client components,
// and route handlers. We'll integrate those in Phase 2.
// This basic client is useful for non-auth related DB interactions initially.
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to check if user email exists in the allowed_users table
// Accepts a Supabase client instance as an argument
export async function isUserAllowed(email: string, supabaseClient: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('allowed_users')
    .select('email')
    .eq('email', email)
    .maybeSingle(); // Use maybeSingle to return null if not found

  if (error) {
    console.error('isUserAllowed Check Error:', error.message);
    return false; // Fail closed on error
  }
  return !!data; // True if email exists in the table
}
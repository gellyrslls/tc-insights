import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// NOTE: This function is specifically for use in Next.js Middleware.
export async function createClient(request: NextRequest) {
  // Create an unmodified response object to copy headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Provide Supabase with functions to read/write cookies from the Middleware context
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is set, update the request and response cookies
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ // Re-create response to apply updated cookies
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the request and response cookies
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ // Re-create response to apply updated cookies
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Important: Refresh session if expired - required for Server Components
  // Calling getUser() ensures the session is checked and refreshed if needed
  await supabase.auth.getUser();

  // Return both the client and the potentially modified response object
  return { supabase, response };
}
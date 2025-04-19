import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// NOTE: This function should only be called in Server Components, Server Actions, or Route Handlers.
export function createClient() {
  const cookieStore = cookies();

  // Create a supabase client on the server with project's credentials
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Provide Supabase with functions to read/write cookies from the Next.js server context
        // NOTE: Making methods async and awaiting cookieStore based on TS error.
        // This might deviate from standard Supabase SSR pattern if cookieStore shouldn't be a Promise here.
        async get(name: string) {
          // Await the promise to get the actual store
          const store = await cookieStore;
          return store.get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            // Await the promise to get the actual store
            const store = await cookieStore;
            store.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            // Await the promise to get the actual store
            const store = await cookieStore;
            store.set({ name, value: '', ...options }); // Using set with empty value as before
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
import { type NextRequest } from 'next/server';
import { createClient as createMiddlewareClient } from '@/lib/supabase/middleware';
import { isUserAllowed } from '@/lib/authUtils'; // Import the helper

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const protectedRoutes = ['/dashboard']; // Add other protected routes
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    if (!user) {
      console.log('Middleware: No user session, redirecting from protected route.');
      return Response.redirect(new URL('/', request.url));
    }

    // Domain Check
    if (!user.email?.endsWith('@usc.edu.ph')) {
      console.log(`Middleware: User ${user.email} denied access to ${pathname} (Invalid Domain).`);
      // Log out the user as they shouldn't have a session for this app
      await supabase.auth.signOut(); // Attempt sign out
      return Response.redirect(new URL('/access-denied?reason=domain', request.url));
    }

    // Whitelist Check using the helper
    const allowed = await isUserAllowed(user.email, supabase);
    if (!allowed) {
      console.log(`Middleware: User ${user.email} denied access to ${pathname} (Not Whitelisted).`);
       // Log out the user as they shouldn't have a session for this app
      await supabase.auth.signOut(); // Attempt sign out
      return Response.redirect(new URL('/access-denied?reason=whitelist', request.url));
    }

    console.log(`Middleware: User ${user.email} authorized for ${pathname}.`);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth|access-denied|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
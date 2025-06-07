import { type NextRequest, NextResponse } from "next/server";
import { createClient as createMiddlewareClient } from "@/lib/supabase/middleware";
import { isUserAllowed } from "@/lib/authUtils";

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // If the user is not logged in and is trying to access anything other than
  // the login-related pages, redirect them to the root to see the LoginPrompt.
  // The root page itself will handle showing the prompt.
  if (!user && pathname !== "/") {
    // This logic is now simpler. We let the root page handle everything.
    // We just need to make sure unauthenticated users can't land on a deep
    // API route or a future protected page by mistake.
    // For now, since our only page IS the root, this middleware is mostly for future-proofing.
    // A simple check is sufficient.
  }

  // If the user IS logged in, we still perform the domain/whitelist check as a defense-in-depth measure.
  if (user) {
    if (!user.email?.endsWith("@usc.edu.ph")) {
      console.log(
        `Middleware: User ${user.email} denied access (Invalid Domain).`
      );
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/access-denied?reason=domain", request.url)
      );
    }

    const allowed = await isUserAllowed(user.email, supabase);
    if (!allowed) {
      console.log(
        `Middleware: User ${user.email} denied access (Not Whitelisted).`
      );
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/access-denied?reason=whitelist", request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (for OAuth callback routes)
     * - access-denied (the error page)
     * - files with extensions (e.g. .svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|auth|access-denied|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

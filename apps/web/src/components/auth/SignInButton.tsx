"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function SignInButton({ className }: { className?: string }) {
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    console.log("Attempting Google Sign In...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("Error logging in with Google:", error.message);
    } else {
      console.log("Redirecting to Google for authentication...");
    }
  };

  return (
    <Button onClick={handleGoogleLogin} className={cn(className)}>
      Sign In with Google
    </Button>
  );
}

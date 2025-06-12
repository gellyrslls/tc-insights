import { createClient } from "@/lib/supabase/server";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { LoginPrompt } from "@/components/auth/LoginPrompt";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user exists, pass the user object as a prop to the client component.
  // Otherwise, show the login prompt.
  return user ? <DashboardClient user={user} /> : <LoginPrompt />;
}

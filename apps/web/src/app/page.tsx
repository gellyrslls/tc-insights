// /app/page.tsx

import { createClient } from "@/lib/supabase/server";
// Corrected import path for the moved component
import DashboardClient from "@/components/dashboard/DashboardClient";
import { LoginPrompt } from "@/components/auth/LoginPrompt";

// Make the component async to await the user session
export default async function Home() {
  const supabase = createClient();

  // Fetch the current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Conditionally render the correct component
  return user ? <DashboardClient /> : <LoginPrompt />;
}

import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function AuthButton() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center gap-4">
      <span className="text-sm hidden sm:inline">Hey, {user.email}!</span>
      <SignOutButton />
    </div>
  ) : null;
}

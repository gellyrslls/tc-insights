import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";

export default async function AuthButton() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-600 hidden sm:inline">
        Hey, {user.email}
      </span>
      <SignOutButton />
    </div>
  ) : null;
}

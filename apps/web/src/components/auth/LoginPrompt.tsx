import { BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import SignInButton from "./SignInButton";

export function LoginPrompt({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    // This outer div ensures the prompt is centered vertically on the page
    <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-sm flex-col items-center gap-6",
          className
        )}
        {...props}
      >
        {/* Header Section */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-card text-card-foreground">
            <BarChart className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Meta Insights Platform
          </h1>
          <p className="text-muted-foreground">
            Sign in with your authorized Google account to continue.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-4 w-full">
          <SignInButton className="w-full" />
        </div>
      </div>
    </div>
  );
}

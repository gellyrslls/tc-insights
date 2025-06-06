import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const LAST_FETCH_TIMESTAMP_KEY = "last_meta_fetch_timestamp";

export async function GET() {
  const supabase = createClient();

  // No auth check needed for this specific, non-sensitive metadata,
  // but you could add one if you wanted to.

  try {
    const { data, error } = await supabase
      .from("app_metadata")
      .select("value_timestamp")
      .eq("key", LAST_FETCH_TIMESTAMP_KEY)
      .single(); // Use single() to get one record or error

    if (error) {
      // It's okay if it's not found, just means it's never been run
      if (error.code === "PGRST116") {
        return NextResponse.json({ lastUpdated: null }, { status: 200 });
      }
      throw error;
    }

    return NextResponse.json(
      { lastUpdated: data.value_timestamp },
      { status: 200 }
    );
  } catch (e: unknown) {
    const error = e as Error;
    console.error("Failed to fetch last updated timestamp:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

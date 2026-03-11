import { createClient } from "@supabase/supabase-js";

// Utility for server-side Supabase client (since we're using simple createClient without auth cookie management for this demo)
export function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

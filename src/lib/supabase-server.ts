import { createClient } from "@supabase/supabase-js";

// Utility for server-side Supabase client.
// Uses SUPABASE_SECRET_KEY (service role) to bypass RLS for server actions.
// Falls back to anon key if the secret key is not configured.
export function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
        process.env.SUPABASE_SECRET_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey);
}

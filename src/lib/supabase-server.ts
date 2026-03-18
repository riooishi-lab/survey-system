import { createClient } from "@supabase/supabase-js";

// Utility for server-side Supabase client.
// Uses SUPABASE_SECRET_KEY (service role) to bypass RLS for server actions.
export function getSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            "サーバー設定エラー: NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SECRET_KEY が設定されていません"
        );
    }

    return createClient(supabaseUrl, supabaseKey);
}

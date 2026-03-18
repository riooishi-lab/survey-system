import { getSupabase } from "@/lib/supabase-server";

/**
 * DBベースのレート制限チェック（複数インスタンス・サーバーレス対応）
 * @param key      識別キー（例: "master-login:127.0.0.1"）
 * @param max      ウィンドウ内の最大試行回数
 * @param windowMs ウィンドウ幅（ミリ秒）
 */
export async function checkRateLimit(
    key: string,
    max: number = 10,
    windowMs: number = 15 * 60 * 1000
): Promise<{ allowed: boolean }> {
    const supabase = getSupabase();
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    // ウィンドウ外の古いエントリを削除
    await supabase
        .from("rate_limit_attempts")
        .delete()
        .eq("key", key)
        .lt("created_at", windowStart);

    // 現在のウィンドウ内の試行回数を取得
    const { count } = await supabase
        .from("rate_limit_attempts")
        .select("*", { count: "exact", head: true })
        .eq("key", key)
        .gte("created_at", windowStart);

    if ((count ?? 0) >= max) {
        return { allowed: false };
    }

    // 新しい試行を記録
    await supabase.from("rate_limit_attempts").insert({ key });

    return { allowed: true };
}

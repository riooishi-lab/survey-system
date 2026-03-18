// インメモリのレート制限（IPアドレスベース）
// 単一サーバーインスタンスで有効。複数インスタンス環境では Redis 等への移行を推奨。

interface RateLimitRecord {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * レート制限チェック
 * @param key      識別キー（例: "master-login:127.0.0.1"）
 * @param max      ウィンドウ内の最大試行回数
 * @param windowMs ウィンドウ幅（ミリ秒）
 */
export function checkRateLimit(
    key: string,
    max: number = 10,
    windowMs: number = 15 * 60 * 1000
): { allowed: boolean } {
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
    }

    if (record.count >= max) {
        return { allowed: false };
    }

    record.count++;
    return { allowed: true };
}

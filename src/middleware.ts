import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // クリックジャッキング防止
    response.headers.set("X-Frame-Options", "DENY");
    // MIME タイプスニッフィング防止
    response.headers.set("X-Content-Type-Options", "nosniff");
    // リファラー情報の制限
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    // 不要なブラウザ機能を無効化
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    // HTTPS 強制（本番環境）
    if (process.env.NODE_ENV === "production") {
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        );
    }
    // Content Security Policy
    // - default-src 'self': 同一オリジンのみ許可
    // - script-src 'self' 'unsafe-inline' 'unsafe-eval': Next.js の動作に必要
    // - style-src 'self' 'unsafe-inline': Tailwind CSS に必要
    // - img-src 'self' data:: 画像は同一オリジン + data URI のみ
    // - font-src 'self': フォントは同一オリジンのみ
    // - connect-src 'self' *.supabase.co: Supabase API への接続を許可
    // - frame-ancestors 'none': iFrame 埋め込みを完全禁止
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
        ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
        : "*.supabase.co";
    response.headers.set(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            `connect-src 'self' https://${supabaseHost}`,
            "frame-ancestors 'none'",
        ].join("; ")
    );

    return response;
}

export const config = {
    matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};

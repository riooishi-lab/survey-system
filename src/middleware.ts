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

    return response;
}

export const config = {
    matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};

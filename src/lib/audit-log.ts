import { getSupabase } from "@/lib/supabase-server";

export type AuditEventType =
    | "master_login_success"
    | "master_login_failure"
    | "company_token_login_success"
    | "company_token_login_failure"
    | "company_password_login_success"
    | "company_password_login_failure"
    | "company_created"
    | "company_soft_deleted"
    | "company_status_changed";

/**
 * 監査ログを記録する
 * ログ書き込み失敗はサイレントに無視（メイン処理を妨げない）
 */
export async function writeAuditLog(
    eventType: AuditEventType,
    options: {
        ip?: string;
        companyId?: string;
        details?: Record<string, unknown>;
    } = {}
) {
    try {
        const supabase = getSupabase();
        await supabase.from("audit_logs").insert({
            event_type: eventType,
            ip_address: options.ip ?? null,
            company_id: options.companyId ?? null,
            details: options.details ?? {},
        });
    } catch {
        // 監査ログの失敗はメイン処理に影響させない
    }
}

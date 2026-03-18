"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";
import { getSupabase } from "@/lib/supabase-server";
import { setMasterSession, clearMasterSession, requireMasterAuth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit-log";

export async function masterLogin(formData: FormData) {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
        ?? headersList.get("x-real-ip")
        ?? "unknown";

    const { allowed } = await checkRateLimit(`master-login:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
        return { error: "ログイン試行が多すぎます。15分後に再試行してください" };
    }

    const password = formData.get("password") as string;
    const masterPassword = process.env.MASTER_PASSWORD;

    if (!masterPassword) {
        return { error: "サーバー設定エラー: MASTER_PASSWORD が設定されていません" };
    }

    // タイミング攻撃対策: SHA-256 ハッシュ化して固定長で比較
    const inputHash = createHash("sha256").update(password ?? "").digest();
    const masterHash = createHash("sha256").update(masterPassword).digest();
    const isValid = timingSafeEqual(inputHash, masterHash);

    if (!isValid) {
        await writeAuditLog("master_login_failure", { ip });
        return { error: "パスワードが正しくありません" };
    }

    await writeAuditLog("master_login_success", { ip });
    await setMasterSession();
    redirect("/master");
}

export async function masterLogout() {
    await clearMasterSession();
    redirect("/master/login");
}

export async function createCompany(formData: FormData) {
    await requireMasterAuth();
    const supabase = getSupabase();

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const contactName = formData.get("contact_name") as string;

    if (!name || !email) {
        return { error: "企業名とメールアドレスは必須です" };
    }

    const { data, error } = await supabase
        .from("companies")
        .insert({ name, email, contact_name: contactName || null })
        .select()
        .single();

    if (error || !data) {
        console.error("Company creation error:", error);
        if (error?.code === "23505") {
            return { error: "このメールアドレスは既に登録されています" };
        }
        return { error: "企業アカウントの作成に失敗しました" };
    }

    await writeAuditLog("company_created", {
        companyId: data.id,
        details: { name, email },
    });

    return { success: true, company: data };
}

export async function getCompanies() {
    await requireMasterAuth();
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("companies")
        .select(`
            *,
            surveys (
                id,
                status,
                responses (count)
            )
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Get companies error:", error);
        return { error: "企業一覧の取得に失敗しました" };
    }

    return { data: data || [] };
}

export async function updateCompanyStatus(companyId: string, status: "active" | "inactive") {
    await requireMasterAuth();
    const supabase = getSupabase();

    const { data: current } = await supabase
        .from("companies")
        .select("status")
        .eq("id", companyId)
        .single();

    const { error } = await supabase
        .from("companies")
        .update({ status })
        .eq("id", companyId);

    if (error) {
        return { error: "ステータスの更新に失敗しました" };
    }

    await writeAuditLog("company_status_changed", {
        companyId,
        details: { from: current?.status, to: status },
    });

    return { success: true };
}

export async function deleteCompany(companyId: string) {
    await requireMasterAuth();
    const supabase = getSupabase();

    // 監査ログ用に会社情報を取得
    const { data: company } = await supabase
        .from("companies")
        .select("name, email")
        .eq("id", companyId)
        .single();

    // ソフトデリート（物理削除せずアーカイブ）
    const { error } = await supabase
        .from("companies")
        .update({ deleted_at: new Date().toISOString(), status: "inactive" })
        .eq("id", companyId);

    if (error) {
        console.error("Company deletion error:", error);
        return { error: "企業の削除に失敗しました" };
    }

    // 該当企業の全セッションを無効化
    await supabase.from("company_sessions").delete().eq("company_id", companyId);
    await supabase.from("company_setup_sessions").delete().eq("company_id", companyId);

    await writeAuditLog("company_soft_deleted", {
        companyId,
        details: { name: company?.name, email: company?.email },
    });

    return { success: true };
}

export async function getMasterCompany(companyId: string) {
    await requireMasterAuth();
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("companies")
        .select(`
            *,
            surveys (
                id,
                title,
                status,
                created_at,
                deadline,
                responses (count)
            )
        `)
        .eq("id", companyId)
        .single();

    if (error || !data) {
        return { error: "企業情報の取得に失敗しました" };
    }

    return { data };
}

export async function getMasterSurveyResults(companyId: string, surveyId: string) {
    await requireMasterAuth();
    const supabase = getSupabase();

    const { data: survey, error } = await supabase
        .from("surveys")
        .select(`
            *,
            questions (*),
            responses (
                *,
                answers (*)
            )
        `)
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (error || !survey) {
        return { error: "サーベイ結果の取得に失敗しました" };
    }

    if (survey.questions) {
        survey.questions.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return { data: survey };
}

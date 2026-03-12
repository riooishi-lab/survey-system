"use server";

import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase-server";
import { setMasterSession, clearMasterSession, requireMasterAuth } from "@/lib/auth";

export async function masterLogin(formData: FormData) {
    const password = formData.get("password") as string;
    const masterPassword = process.env.MASTER_PASSWORD;

    if (!masterPassword) {
        return { error: "サーバー設定エラー: MASTER_PASSWORD が設定されていません" };
    }

    if (password !== masterPassword) {
        return { error: "パスワードが正しくありません" };
    }

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

    const { error } = await supabase
        .from("companies")
        .update({ status })
        .eq("id", companyId);

    if (error) {
        return { error: "ステータスの更新に失敗しました" };
    }

    return { success: true };
}

export async function deleteCompany(companyId: string) {
    await requireMasterAuth();
    const supabase = getSupabase();

    const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", companyId);

    if (error) {
        console.error("Company deletion error:", error);
        return { error: "企業の削除に失敗しました" };
    }

    return { success: true };
}

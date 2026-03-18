import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { getSupabase } from "@/lib/supabase-server";

const SESSION_DURATION_SEC = 60 * 60 * 24 * 7; // 7日
const SETUP_SESSION_DURATION_SEC = 60 * 60;     // 1時間

const MASTER_SESSION_COOKIE = "master_auth";
const COMPANY_SESSION_COOKIE = "company_id";
const COMPANY_SETUP_COOKIE = "company_setup_id";

function generateToken(): string {
    return randomBytes(32).toString("hex");
}

// ===== Master Auth =====

export async function setMasterSession() {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SEC * 1000).toISOString();
    const supabase = getSupabase();

    // 期限切れセッションをクリーンアップ
    await supabase.from("master_sessions").delete().lt("expires_at", new Date().toISOString());

    const { error } = await supabase.from("master_sessions").insert({ token, expires_at: expiresAt });
    if (error) throw new Error("セッションの作成に失敗しました");

    const cookieStore = await cookies();
    cookieStore.set(MASTER_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_SEC,
        path: "/",
    });
}

export async function isMasterAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get(MASTER_SESSION_COOKIE)?.value;
    if (!token) return false;

    const supabase = getSupabase();
    const { data } = await supabase
        .from("master_sessions")
        .select("id")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

    return !!data;
}

export async function requireMasterAuth() {
    const ok = await isMasterAuthenticated();
    if (!ok) redirect("/master/login");
}

export async function clearMasterSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(MASTER_SESSION_COOKIE)?.value;

    if (token) {
        const supabase = getSupabase();
        await supabase.from("master_sessions").delete().eq("token", token);
    }

    cookieStore.delete(MASTER_SESSION_COOKIE);
}

// ===== Company Auth =====

export async function setCompanySession(companyId: string) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SEC * 1000).toISOString();
    const supabase = getSupabase();

    const { error } = await supabase
        .from("company_sessions")
        .insert({ token, company_id: companyId, expires_at: expiresAt });
    if (error) throw new Error("セッションの作成に失敗しました");

    const cookieStore = await cookies();
    cookieStore.set(COMPANY_SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_DURATION_SEC,
        path: "/",
    });
}

export async function getCompanySession(): Promise<string | undefined> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COMPANY_SESSION_COOKIE)?.value;
    if (!token) return undefined;

    const supabase = getSupabase();
    const { data } = await supabase
        .from("company_sessions")
        .select("company_id")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

    return data?.company_id;
}

export async function requireCompanyAuth(): Promise<string> {
    const companyId = await getCompanySession();
    if (!companyId) redirect("/company/login");
    return companyId;
}

export async function clearCompanySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COMPANY_SESSION_COOKIE)?.value;

    if (token) {
        const supabase = getSupabase();
        await supabase.from("company_sessions").delete().eq("token", token);
    }

    cookieStore.delete(COMPANY_SESSION_COOKIE);
}

// ===== Company Setup Session (初回セットアップ用一時セッション) =====

export async function setCompanySetupSession(companyId: string) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + SETUP_SESSION_DURATION_SEC * 1000).toISOString();
    const supabase = getSupabase();

    // 同一会社の既存セットアップセッションを削除
    await supabase.from("company_setup_sessions").delete().eq("company_id", companyId);

    const { error } = await supabase
        .from("company_setup_sessions")
        .insert({ token, company_id: companyId, expires_at: expiresAt });
    if (error) throw new Error("セッションの作成に失敗しました");

    const cookieStore = await cookies();
    cookieStore.set(COMPANY_SETUP_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SETUP_SESSION_DURATION_SEC,
        path: "/",
    });
}

export async function getCompanySetupSession(): Promise<string | undefined> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COMPANY_SETUP_COOKIE)?.value;
    if (!token) return undefined;

    const supabase = getSupabase();
    const { data } = await supabase
        .from("company_setup_sessions")
        .select("company_id")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

    return data?.company_id;
}

export async function clearCompanySetupSession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COMPANY_SETUP_COOKIE)?.value;

    if (token) {
        const supabase = getSupabase();
        await supabase.from("company_setup_sessions").delete().eq("token", token);
    }

    cookieStore.delete(COMPANY_SETUP_COOKIE);
}

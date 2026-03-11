import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const MASTER_SESSION_KEY = "master_auth";
const COMPANY_SESSION_KEY = "company_id";
const COMPANY_SETUP_SESSION_KEY = "company_setup_id";

// ===== Master Auth =====

export async function isMasterAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    return cookieStore.get(MASTER_SESSION_KEY)?.value === "authenticated";
}

export async function requireMasterAuth() {
    const ok = await isMasterAuthenticated();
    if (!ok) redirect("/master/login");
}

export async function setMasterSession() {
    const cookieStore = await cookies();
    cookieStore.set(MASTER_SESSION_KEY, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });
}

export async function clearMasterSession() {
    const cookieStore = await cookies();
    cookieStore.delete(MASTER_SESSION_KEY);
}

// ===== Company Auth =====

export async function getCompanySession(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(COMPANY_SESSION_KEY)?.value;
}

export async function requireCompanyAuth(): Promise<string> {
    const companyId = await getCompanySession();
    if (!companyId) redirect("/company/login");
    return companyId;
}

export async function setCompanySession(companyId: string) {
    const cookieStore = await cookies();
    cookieStore.set(COMPANY_SESSION_KEY, companyId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });
}

export async function clearCompanySession() {
    const cookieStore = await cookies();
    cookieStore.delete(COMPANY_SESSION_KEY);
}

// ===== Company Setup Session (初回セットアップ用一時セッション) =====

export async function getCompanySetupSession(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(COMPANY_SETUP_SESSION_KEY)?.value;
}

export async function setCompanySetupSession(companyId: string) {
    const cookieStore = await cookies();
    cookieStore.set(COMPANY_SETUP_SESSION_KEY, companyId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1時間で期限切れ
        path: "/",
    });
}

export async function clearCompanySetupSession() {
    const cookieStore = await cookies();
    cookieStore.delete(COMPANY_SETUP_SESSION_KEY);
}

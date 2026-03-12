"use server";

import { redirect } from "next/navigation";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getSupabase } from "@/lib/supabase-server";
import {
    requireCompanyAuth,
    setCompanySession,
    clearCompanySession,
    setCompanySetupSession,
    getCompanySetupSession,
    clearCompanySetupSession,
} from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendPasswordResetEmail } from "@/lib/email";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const [hashedPassword, salt] = hash.split(".");
    const hashedBuf = Buffer.from(hashedPassword, "hex");
    const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
}

// トークンでのログイン（初回はセットアップページへリダイレクト）
export async function companyLogin(formData: FormData) {
    const token = (formData.get("access_token") as string)?.trim();

    if (!token) {
        return { error: "アクセストークンを入力してください" };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("access_token", token)
        .single();

    if (error || !data) {
        return { error: "アクセストークンが正しくありません" };
    }

    if (data.status === "inactive") {
        return { error: "このアカウントは無効化されています。管理者にお問い合わせください" };
    }

    // 初回ログイン: セットアップページへ (is_initialized が明示的に false の場合のみ)
    if (data.is_initialized === false) {
        await setCompanySetupSession(data.id);
        redirect("/company/setup");
    }

    await setCompanySession(data.id);
    redirect("/company");
}

// IDとパスワードでのログイン（セットアップ完了後）
export async function companyPasswordLogin(formData: FormData) {
    const loginId = (formData.get("login_id") as string)?.trim();
    const password = (formData.get("password") as string);

    if (!loginId || !password) {
        return { error: "メールアドレスとパスワードを入力してください" };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("companies")
        .select("id, status, is_initialized, password_hash")
        .eq("login_id", loginId)
        .single();

    if (error || !data) {
        return { error: "メールアドレスまたはパスワードが正しくありません" };
    }

    if (data.status === "inactive") {
        return { error: "このアカウントは無効化されています。管理者にお問い合わせください" };
    }

    if (!data.is_initialized || !data.password_hash) {
        return { error: "パスワードが設定されていません。まずトークンでログインしてください" };
    }

    const isValid = await verifyPassword(password, data.password_hash);
    if (!isValid) {
        return { error: "メールアドレスまたはパスワードが正しくありません" };
    }

    await setCompanySession(data.id);
    redirect("/company");
}

// 初回セットアップ: ログインIDとパスワードを設定
export async function setupCompanyCredentials(formData: FormData) {
    const companyId = await getCompanySetupSession();
    if (!companyId) {
        return { error: "セッションが切れました。再度トークンでログインしてください" };
    }

    const loginId = (formData.get("login_id") as string)?.trim();
    const password = (formData.get("password") as string);
    const passwordConfirm = (formData.get("password_confirm") as string);

    if (!loginId) {
        return { error: "メールアドレスを入力してください" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginId)) {
        return { error: "有効なメールアドレスを入力してください" };
    }

    if (!password || password.length < 8) {
        return { error: "パスワードは8文字以上で入力してください" };
    }

    if (password !== passwordConfirm) {
        return { error: "パスワードが一致しません" };
    }

    const supabase = getSupabase();

    // login_id の重複チェック
    const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("login_id", loginId)
        .single();

    if (existing) {
        return { error: "このメールアドレスはすでに使用されています" };
    }

    const passwordHash = await hashPassword(password);

    const { error } = await supabase
        .from("companies")
        .update({
            login_id: loginId,
            password_hash: passwordHash,
            is_initialized: true,
        })
        .eq("id", companyId);

    if (error) {
        return { error: "設定の保存に失敗しました" };
    }

    await clearCompanySetupSession();
    await setCompanySession(companyId);
    redirect("/company");
}

export async function companyLogout() {
    await clearCompanySession();
    redirect("/company/login");
}

// パスワードリセット申請: トークン生成＆メール送信
export async function requestPasswordReset(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase();

    if (!email) {
        return { error: "メールアドレスを入力してください" };
    }

    const supabase = getSupabase();
    const { data: company } = await supabase
        .from("companies")
        .select("id, login_id, status, is_initialized")
        .eq("login_id", email)
        .single();

    // セキュリティ上、メールが存在しなくてもエラーを返さず成功扱いにする
    if (!company || company.status === "inactive" || !company.is_initialized) {
        return { success: true };
    }

    // 既存の未使用トークンを無効化（上書き）
    await supabase
        .from("password_reset_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("company_id", company.id)
        .is("used_at", null);

    const { data: tokenData, error: tokenError } = await supabase
        .from("password_reset_tokens")
        .insert({ company_id: company.id })
        .select("token")
        .single();

    if (tokenError || !tokenData) {
        return { error: "処理に失敗しました。しばらくしてから再度お試しください" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/company/reset-password/${tokenData.token}`;

    try {
        await sendPasswordResetEmail(email, resetUrl);
    } catch (err) {
        console.error("Email send error:", err);
        return { error: "メールの送信に失敗しました。しばらくしてから再度お試しください" };
    }

    return { success: true };
}

// パスワードリセット確定: トークン検証＆パスワード更新
export async function resetPassword(token: string, formData: FormData) {
    const password = (formData.get("password") as string);
    const passwordConfirm = (formData.get("password_confirm") as string);

    if (!password || password.length < 8) {
        return { error: "パスワードは8文字以上で入力してください" };
    }

    if (password !== passwordConfirm) {
        return { error: "パスワードが一致しません" };
    }

    if (!token) {
        return { error: "無効なリセットリンクです" };
    }

    const supabase = getSupabase();
    const { data: tokenData, error: tokenError } = await supabase
        .from("password_reset_tokens")
        .select("id, company_id, expires_at, used_at")
        .eq("token", token)
        .single();

    if (tokenError || !tokenData) {
        return { error: "無効なリセットリンクです" };
    }

    if (tokenData.used_at) {
        return { error: "このリセットリンクはすでに使用済みです" };
    }

    if (new Date(tokenData.expires_at) < new Date()) {
        return { error: "リセットリンクの有効期限が切れています。再度申請してください" };
    }

    const passwordHash = await hashPassword(password);

    const { error: updateError } = await supabase
        .from("companies")
        .update({ password_hash: passwordHash })
        .eq("id", tokenData.company_id);

    if (updateError) {
        return { error: "パスワードの更新に失敗しました" };
    }

    await supabase
        .from("password_reset_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenData.id);

    return { success: true };
}

export async function getCompanyInfo() {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

    if (error || !data) return { error: "企業情報の取得に失敗しました" };
    return { data };
}

export async function getCompanySurveys() {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("surveys")
        .select(`
            *,
            responses (count),
            survey_links (id, token, is_active, expires_at, created_at)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Get company surveys error:", error);
        return { error: "サーベイ一覧の取得に失敗しました" };
    }

    return { data: data || [] };
}

export async function getCompanySurvey(surveyId: string) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("surveys")
        .select(`
            *,
            questions (*),
            survey_links (id, token, is_active, expires_at, created_at)
        `)
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (error || !data) {
        return { error: "サーベイの取得に失敗しました" };
    }

    if (data.questions) {
        data.questions.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return { data };
}

export async function createCompanySurvey(surveyData: {
    title: string;
    description: string;
    deadline: string;
    status: "draft" | "active" | "closed";
    is_anonymous?: boolean;
    respondent_fields?: Record<string, boolean>;
    questions: { text: string; type: "score" | "text" | "choice"; order_index: number; options?: string[] }[];
}) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .insert({
            title: surveyData.title,
            description: surveyData.description || null,
            deadline: surveyData.deadline || null,
            status: surveyData.status,
            company_id: companyId,
            is_anonymous: surveyData.is_anonymous ?? false,
            respondent_fields: surveyData.respondent_fields ?? { name: false, age: false, gender: false, join_year: false, hire_type: false },
        })
        .select()
        .single();

    if (surveyError || !survey) {
        console.error("Survey creation error:", surveyError);
        return { error: "サーベイの作成に失敗しました" };
    }

    if (surveyData.questions && surveyData.questions.length > 0) {
        const { error: questionsError } = await supabase
            .from("questions")
            .insert(
                surveyData.questions.map((q) => ({
                    survey_id: survey.id,
                    text: q.text,
                    type: q.type,
                    order_index: q.order_index,
                    options: q.type === "choice" ? (q.options ?? []) : null,
                }))
            );

        if (questionsError) {
            console.error("Questions creation error:", questionsError);
            return { error: "設問の作成に失敗しました" };
        }
    }

    revalidatePath("/company");
    return { success: true, surveyId: survey.id };
}

export async function updateCompanySurvey(
    surveyId: string,
    surveyData: {
        title: string;
        description: string;
        deadline: string;
        status: "draft" | "active" | "closed";
        is_anonymous?: boolean;
        respondent_fields?: Record<string, boolean>;
        questions: { id?: string; text: string; type: "score" | "text" | "choice"; order_index: number; options?: string[] }[];
    }
) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    // Verify ownership
    const { data: existing } = await supabase
        .from("surveys")
        .select("id")
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (!existing) return { error: "権限がありません" };

    // 設問の変更（追加・削除・回答方式の変更）を検知し、既存リンクを無効化する
    const { data: currentQuestions } = await supabase
        .from("questions")
        .select("id, text, type, order_index")
        .eq("survey_id", surveyId)
        .order("order_index");

    const newValidQuestions = surveyData.questions;
    const oldQuestions = currentQuestions || [];

    const questionsChanged =
        oldQuestions.length !== newValidQuestions.length ||
        newValidQuestions.some((newQ, i) => {
            const oldQ = oldQuestions[i];
            if (!oldQ) return true;
            // 既存IDなしの設問は新規追加
            if (!newQ.id) return true;
            // 回答方式の変更
            if (newQ.type !== oldQ.type) return true;
            return false;
        });

    if (questionsChanged) {
        await supabase
            .from("survey_links")
            .update({ is_active: false })
            .eq("survey_id", surveyId)
            .eq("is_active", true);
    }

    const { error: surveyError } = await supabase
        .from("surveys")
        .update({
            title: surveyData.title,
            description: surveyData.description || null,
            deadline: surveyData.deadline || null,
            status: surveyData.status,
            is_anonymous: surveyData.is_anonymous ?? false,
            respondent_fields: surveyData.respondent_fields ?? { name: false, age: false, gender: false, join_year: false, hire_type: false },
        })
        .eq("id", surveyId);

    if (surveyError) return { error: "サーベイの更新に失敗しました" };

    // Handle questions
    const existingIds = surveyData.questions.filter((q) => q.id).map((q) => q.id!);

    if (existingIds.length > 0) {
        await supabase
            .from("questions")
            .delete()
            .eq("survey_id", surveyId)
            .not("id", "in", `(${existingIds.join(",")})`);
    } else {
        await supabase.from("questions").delete().eq("survey_id", surveyId);
    }

    const toUpdate = surveyData.questions.filter((q) => q.id);
    const toInsert = surveyData.questions.filter((q) => !q.id);

    for (const q of toUpdate) {
        await supabase
            .from("questions")
            .update({ text: q.text, type: q.type, order_index: q.order_index, options: q.type === "choice" ? (q.options ?? []) : null })
            .eq("id", q.id!);
    }

    if (toInsert.length > 0) {
        await supabase.from("questions").insert(
            toInsert.map((q) => ({
                survey_id: surveyId,
                text: q.text,
                type: q.type,
                order_index: q.order_index,
                options: q.type === "choice" ? (q.options ?? []) : null,
            }))
        );
    }

    revalidatePath("/company");
    return { success: true };
}

export async function issueSurveyLink(surveyId: string, expiresAt?: string) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    // Verify ownership
    const { data: survey } = await supabase
        .from("surveys")
        .select("id, status")
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (!survey) return { error: "権限がありません" };

    const { data, error } = await supabase
        .from("survey_links")
        .insert({
            survey_id: surveyId,
            expires_at: expiresAt || null,
        })
        .select()
        .single();

    if (error || !data) {
        console.error("Link creation error:", error);
        return { error: "リンクの発行に失敗しました" };
    }

    revalidatePath(`/company/surveys/${surveyId}`);
    return { success: true, token: data.token };
}

export async function deactivateSurveyLink(linkId: string) {
    await requireCompanyAuth();
    const supabase = getSupabase();

    // Verify the link belongs to a company survey
    const { data: link } = await supabase
        .from("survey_links")
        .select("id, survey_id, surveys!inner(company_id)")
        .eq("id", linkId)
        .single();

    if (!link) return { error: "リンクが見つかりません" };

    const { error } = await supabase
        .from("survey_links")
        .update({ is_active: false })
        .eq("id", linkId);

    if (error) return { error: "リンクの無効化に失敗しました" };

    revalidatePath("/company");
    return { success: true };
}

export async function getCompanySurveyResults(surveyId: string) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select(`
            *,
            questions (*),
            responses (
                id,
                created_at,
                respondent_name,
                respondent_age,
                respondent_gender,
                respondent_join_year,
                respondent_hire_type,
                answers (*)
            )
        `)
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (surveyError || !survey) {
        return { error: "結果の取得に失敗しました" };
    }

    if (survey.questions) {
        survey.questions.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return { data: survey };
}

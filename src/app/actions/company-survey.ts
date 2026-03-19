"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
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
import { sendPasswordResetEmail, sendSurveyReminderEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit-log";

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
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
        ?? headersList.get("x-real-ip")
        ?? "unknown";

    const { allowed } = await checkRateLimit(`company-token-login:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
        return { error: "ログイン試行が多すぎます。15分後に再試行してください" };
    }

    const token = (formData.get("access_token") as string)?.trim();

    if (!token) {
        return { error: "アクセストークンを入力してください" };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("access_token", token)
        .is("deleted_at", null)
        .single();

    if (error || !data) {
        await writeAuditLog("company_token_login_failure", { ip });
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

    await writeAuditLog("company_token_login_success", { ip, companyId: data.id });
    await setCompanySession(data.id);
    redirect("/company");
}

// IDとパスワードでのログイン（セットアップ完了後）
export async function companyPasswordLogin(formData: FormData) {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
        ?? headersList.get("x-real-ip")
        ?? "unknown";

    const loginId = (formData.get("login_id") as string)?.trim().toLowerCase();
    const { allowed } = await checkRateLimit(`company-login:${ip}:${loginId ?? ""}`, 10, 15 * 60 * 1000);
    if (!allowed) {
        return { error: "ログイン試行が多すぎます。15分後に再試行してください" };
    }

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
        await writeAuditLog("company_password_login_failure", { ip, details: { login_id: loginId } });
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
        await writeAuditLog("company_password_login_failure", { ip, companyId: data.id });
        return { error: "メールアドレスまたはパスワードが正しくありません" };
    }

    await writeAuditLog("company_password_login_success", { ip, companyId: data.id });
    await setCompanySession(data.id);
    redirect("/company");
}

// 初回セットアップ: ログインIDとパスワードを設定
export async function setupCompanyCredentials(formData: FormData) {
    const companyId = await getCompanySetupSession();
    if (!companyId) {
        return { error: "セッションが切れました。再度トークンでログインしてください" };
    }

    const loginId = (formData.get("login_id") as string)?.trim().toLowerCase();
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

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return { error: "パスワードは英字と数字を両方含めてください" };
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
    respondent_fields?: Record<string, boolean | string[]>;
    questions: { text: string; type: "score" | "text" | "choice"; order_index: number; options?: string[]; genre?: string }[];
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
            respondent_fields: surveyData.respondent_fields ?? { name: false, age: false, gender: false, join_year: false, hire_type: false, department: false },
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
                    // choice 以外は options を含めない（DB に options カラムがない環境でも動作させるため）
                    ...(q.type === "choice" ? { options: q.options ?? [] } : {}),
                    ...(q.genre ? { genre: q.genre } : {}),
                }))
            );

        if (questionsError) {
            console.error("Questions creation error:", questionsError);
            // 孤立したサーベイを削除してクリーンな状態に戻す
            await supabase.from("surveys").delete().eq("id", survey.id);
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
        respondent_fields?: Record<string, boolean | string[]>;
        target_respondents?: number | null;
        questions: { id?: string; text: string; type: "score" | "text" | "choice"; order_index: number; options?: string[]; genre?: string }[];
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

    let linksDeactivated = false;
    if (questionsChanged) {
        const { data: activeLinks } = await supabase
            .from("survey_links")
            .select("id")
            .eq("survey_id", surveyId)
            .eq("is_active", true);
        if (activeLinks && activeLinks.length > 0) {
            await supabase
                .from("survey_links")
                .update({ is_active: false })
                .eq("survey_id", surveyId)
                .eq("is_active", true);
            linksDeactivated = true;
        }
    }

    const { error: surveyError } = await supabase
        .from("surveys")
        .update({
            title: surveyData.title,
            description: surveyData.description || null,
            deadline: surveyData.deadline || null,
            status: surveyData.status,
            is_anonymous: surveyData.is_anonymous ?? false,
            respondent_fields: surveyData.respondent_fields ?? { name: false, age: false, gender: false, join_year: false, hire_type: false, department: false },
            target_respondents: surveyData.target_respondents ?? null,
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
            .update({
                text: q.text,
                type: q.type,
                order_index: q.order_index,
                // choice 以外は options を含めない
                ...(q.type === "choice" ? { options: q.options ?? [] } : {}),
                genre: q.genre ?? null,
            })
            .eq("id", q.id!);
    }

    if (toInsert.length > 0) {
        await supabase.from("questions").insert(
            toInsert.map((q) => ({
                survey_id: surveyId,
                text: q.text,
                type: q.type,
                order_index: q.order_index,
                // choice 以外は options を含めない
                ...(q.type === "choice" ? { options: q.options ?? [] } : {}),
                genre: q.genre ?? null,
            }))
        );
    }

    revalidatePath("/company");
    return { success: true, linksDeactivated };
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

export async function getCompanyDepartmentOptions(): Promise<string[]> {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();
    const { data } = await supabase
        .from("companies")
        .select("department_options")
        .eq("id", companyId)
        .single();
    return (data?.department_options as string[]) ?? [];
}

export async function updateCompanySettings(settings: { department_options: string[] }) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { error } = await supabase
        .from("companies")
        .update({ department_options: settings.department_options })
        .eq("id", companyId);

    if (error) {
        console.error("Company settings update error:", error);
        return { error: `設定の保存に失敗しました [${error.code}] ${error.message}` };
    }

    revalidatePath("/company");
    return { success: true };
}

export async function deleteCompanySurvey(surveyId: string) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    // Verify ownership
    const { data: survey } = await supabase
        .from("surveys")
        .select("id")
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (!survey) return { error: "権限がありません" };

    const { error } = await supabase
        .from("surveys")
        .delete()
        .eq("id", surveyId);

    if (error) return { error: "削除に失敗しました" };

    revalidatePath("/company");
    return { success: true };
}

export async function copyCompanySurvey(surveyId: string) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data: original } = await supabase
        .from("surveys")
        .select("*, questions(*)")
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (!original) return { error: "権限がありません" };

    const { data: newSurvey, error: surveyError } = await supabase
        .from("surveys")
        .insert({
            company_id: companyId,
            title: `${original.title}（コピー）`,
            description: original.description,
            deadline: null,
            status: "draft",
            is_anonymous: original.is_anonymous,
            respondent_fields: original.respondent_fields,
            target_respondents: original.target_respondents,
        })
        .select()
        .single();

    if (surveyError || !newSurvey) return { error: "コピーの作成に失敗しました" };

    const questions = (original.questions || []).sort((a: any, b: any) => a.order_index - b.order_index);
    if (questions.length > 0) {
        const { error: qError } = await supabase.from("questions").insert(
            questions.map((q: any) => ({
                survey_id: newSurvey.id,
                text: q.text,
                type: q.type,
                order_index: q.order_index,
                options: q.options ?? null,
                genre: q.genre ?? null,
            }))
        );
        if (qError) {
            await supabase.from("surveys").delete().eq("id", newSurvey.id);
            return { error: "設問のコピーに失敗しました" };
        }
    }

    revalidatePath("/company");
    return { success: true, surveyId: newSurvey.id };
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
                *,
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

export async function sendSurveyReminder(surveyId: string, emails: string[]) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data: survey } = await supabase
        .from("surveys")
        .select("id, title, status, deadline, survey_links(token, is_active, expires_at)")
        .eq("id", surveyId)
        .eq("company_id", companyId)
        .single();

    if (!survey) return { error: "サーベイが見つかりません" };
    if (survey.status !== "active") return { error: "公開中のサーベイのみリマインドを送信できます" };

    const activeLink = (survey.survey_links as any[])?.find(
        (l: any) => l.is_active && (!l.expires_at || new Date(l.expires_at) > new Date())
    );

    if (!activeLink) return { error: "有効なサーベイリンクがありません。先にリンクを発行してください" };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const surveyUrl = `${baseUrl}/survey/${activeLink.token}`;
    const deadlineStr = survey.deadline
        ? new Date(survey.deadline).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
        : undefined;

    let sentCount = 0;
    const errors: string[] = [];

    for (const email of emails) {
        try {
            await sendSurveyReminderEmail(email.trim(), survey.title, surveyUrl, deadlineStr);
            sentCount++;
        } catch (err) {
            console.error(`Reminder email failed for ${email}:`, err);
            errors.push(email);
        }
    }

    // 送信記録を保存
    await supabase.from("survey_reminders").insert({
        survey_id: surveyId,
        recipient_count: sentCount,
        sent_by: companyId,
    });

    if (errors.length > 0) {
        return { success: true, sentCount, errors };
    }

    return { success: true, sentCount };
}

export async function getCompanyTrendData() {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data: surveys, error } = await supabase
        .from("surveys")
        .select(`
            id, title, status, created_at, deadline, target_respondents,
            questions (id, text, type, genre, order_index),
            responses (
                id, created_at,
                answers (question_id, score, text_value)
            )
        `)
        .eq("company_id", companyId)
        .in("status", ["active", "closed"])
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Trend data error:", error);
        return { error: "トレンドデータの取得に失敗しました" };
    }

    // 各サーベイのジャンル別平均スコアと全体平均を計算
    const trendData = (surveys || []).map((survey: any) => {
        const responses = survey.responses || [];
        const questions = survey.questions || [];
        const scoreQuestions = questions.filter((q: any) => q.type === "score");

        const genreAvgs: Record<string, number> = {};
        const genres = ["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"];
        for (const genre of genres) {
            const genreQs = scoreQuestions.filter((q: any) => q.genre === genre);
            if (genreQs.length === 0) continue;
            const scores = responses.flatMap((r: any) =>
                (r.answers || [])
                    .filter((a: any) => genreQs.some((q: any) => q.id === a.question_id) && a.score != null)
                    .map((a: any) => a.score)
            );
            if (scores.length > 0) {
                genreAvgs[genre] = scores.reduce((s: number, v: number) => s + v, 0) / scores.length;
            }
        }

        const allScores = responses.flatMap((r: any) =>
            (r.answers || [])
                .filter((a: any) => scoreQuestions.some((q: any) => q.id === a.question_id) && a.score != null)
                .map((a: any) => a.score)
        );
        const overallAvg = allScores.length > 0 ? allScores.reduce((s: number, v: number) => s + v, 0) / allScores.length : 0;

        return {
            id: survey.id,
            title: survey.title,
            status: survey.status,
            createdAt: survey.created_at,
            deadline: survey.deadline,
            responseCount: responses.length,
            targetRespondents: survey.target_respondents,
            overallAvg,
            genreAvgs,
        };
    });

    return { data: trendData };
}

// === ユーザー管理（閲覧権限の階層化） ===

export async function getCompanyUsers() {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data, error } = await supabase
        .from("company_users")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });

    if (error) return { error: "ユーザー一覧の取得に失敗しました" };
    return { data: data || [] };
}

export async function createCompanyUser(userData: {
    name: string;
    email: string;
    role: "admin" | "manager" | "viewer";
    department?: string;
}) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    if (!userData.name.trim() || !userData.email.trim()) {
        return { error: "名前とメールアドレスは必須です" };
    }

    // 重複チェック
    const { data: existing } = await supabase
        .from("company_users")
        .select("id")
        .eq("company_id", companyId)
        .eq("email", userData.email.toLowerCase().trim())
        .single();

    if (existing) {
        return { error: "このメールアドレスはすでに登録されています" };
    }

    const { data, error } = await supabase
        .from("company_users")
        .insert({
            company_id: companyId,
            name: userData.name.trim(),
            email: userData.email.toLowerCase().trim(),
            role: userData.role,
            department: userData.department?.trim() || null,
        })
        .select()
        .single();

    if (error) {
        console.error("Create company user error:", error);
        return { error: "ユーザーの作成に失敗しました" };
    }

    revalidatePath("/company/users");
    return { success: true, data };
}

export async function updateCompanyUser(userId: string, userData: {
    name?: string;
    role?: "admin" | "manager" | "viewer";
    department?: string;
    is_active?: boolean;
}) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    // 所属確認
    const { data: user } = await supabase
        .from("company_users")
        .select("id")
        .eq("id", userId)
        .eq("company_id", companyId)
        .single();

    if (!user) return { error: "ユーザーが見つかりません" };

    const updateData: Record<string, any> = {};
    if (userData.name !== undefined) updateData.name = userData.name.trim();
    if (userData.role !== undefined) updateData.role = userData.role;
    if (userData.department !== undefined) updateData.department = userData.department.trim() || null;
    if (userData.is_active !== undefined) updateData.is_active = userData.is_active;

    const { error } = await supabase
        .from("company_users")
        .update(updateData)
        .eq("id", userId);

    if (error) return { error: "ユーザーの更新に失敗しました" };

    revalidatePath("/company/users");
    return { success: true };
}

export async function deleteCompanyUser(userId: string) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data: user } = await supabase
        .from("company_users")
        .select("id")
        .eq("id", userId)
        .eq("company_id", companyId)
        .single();

    if (!user) return { error: "ユーザーが見つかりません" };

    const { error } = await supabase
        .from("company_users")
        .delete()
        .eq("id", userId);

    if (error) return { error: "ユーザーの削除に失敗しました" };

    revalidatePath("/company/users");
    return { success: true };
}

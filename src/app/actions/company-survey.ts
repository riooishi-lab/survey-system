"use server";

import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase-server";
import {
    requireCompanyAuth,
    setCompanySession,
    clearCompanySession,
} from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function companyLogin(formData: FormData) {
    const token = (formData.get("access_token") as string)?.trim();

    if (!token) {
        return { error: "アクセストークンを入力してください" };
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("companies")
        .select("id, name, status")
        .eq("access_token", token)
        .single();

    if (error || !data) {
        return { error: "アクセストークンが正しくありません" };
    }

    if (data.status === "inactive") {
        return { error: "このアカウントは無効化されています。管理者にお問い合わせください" };
    }

    await setCompanySession(data.id);
    redirect("/company");
}

export async function companyLogout() {
    await clearCompanySession();
    redirect("/company/login");
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
    questions: { text: string; type: "score" | "text"; order_index: number }[];
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
            is_anonymous: surveyData.is_anonymous ?? true,
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
        questions: { id?: string; text: string; type: "score" | "text"; order_index: number }[];
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

    const { error: surveyError } = await supabase
        .from("surveys")
        .update({
            title: surveyData.title,
            description: surveyData.description || null,
            deadline: surveyData.deadline || null,
            status: surveyData.status,
            is_anonymous: surveyData.is_anonymous ?? true,
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
            .update({ text: q.text, type: q.type, order_index: q.order_index })
            .eq("id", q.id!);
    }

    if (toInsert.length > 0) {
        await supabase.from("questions").insert(
            toInsert.map((q) => ({
                survey_id: surveyId,
                text: q.text,
                type: q.type,
                order_index: q.order_index,
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
    const companyId = await requireCompanyAuth();
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

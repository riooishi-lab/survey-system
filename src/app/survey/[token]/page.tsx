import { getSupabase } from "@/lib/supabase-server";
import SurveyClientForm from "@/app/SurveyClientForm";

export const dynamic = "force-dynamic";

export default async function EmployeeSurveyPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const supabase = getSupabase();

    // Resolve token to survey
    const { data: link, error: linkError } = await supabase
        .from("survey_links")
        .select(`
            id,
            is_active,
            expires_at,
            survey_id,
            surveys (
                id,
                title,
                description,
                status,
                is_anonymous,
                respondent_fields,
                questions (*)
            )
        `)
        .eq("token", token)
        .single();

    // Token not found
    if (linkError || !link) {
        return <ErrorPage message="リンクが見つかりません。URLをご確認ください。" />;
    }

    // Link disabled
    if (!link.is_active) {
        return <ErrorPage message="このリンクは無効化されています。担当者にお問い合わせください。" />;
    }

    // Expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return <ErrorPage message="このリンクの有効期限が切れています。担当者にお問い合わせください。" />;
    }

    const survey = link.surveys as any;

    // Survey not active
    if (!survey || survey.status !== "active") {
        return <ErrorPage message="現在このサーベイは受付していません。" />;
    }

    const questions = (survey.questions || []).sort((a: any, b: any) => a.order_index - b.order_index);

    if (questions.length === 0) {
        return <ErrorPage message="このサーベイには設問がありません。" />;
    }

    return (
        <SurveyClientForm
            surveyId={survey.id}
            title={survey.title}
            description={survey.description}
            questions={questions}
            isAnonymous={survey.is_anonymous ?? true}
            respondentFields={survey.respondent_fields ?? {}}
        />
    );
}

function ErrorPage({ message }: { message: string }) {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
            <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
                <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold text-slate-900 mb-2">サーベイを表示できません</h1>
                <p className="text-slate-600 text-sm">{message}</p>
            </div>
        </div>
    );
}

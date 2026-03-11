import { getSupabase } from "@/lib/supabase-server";
import SurveyClientForm from "@/app/SurveyClientForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPreviewPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = getSupabase();
    const { id } = await params;

    const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select(`
      *,
      questions (*)
    `)
        .eq("id", id)
        .single();

    if (surveyError || !survey) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <p className="text-red-500 mb-4">アンケートが見つかりません</p>
                <Link href="/admin">
                    <Button variant="outline">ダッシュボードへ戻る</Button>
                </Link>
            </div>
        );
    }

    const questions = survey.questions?.sort((a: any, b: any) => a.order_index - b.order_index) || [];

    return (
        <div className="bg-slate-50">
            <div className="max-w-3xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">
                <Link href="/admin">
                    <Button variant="ghost" className="gap-2 text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="h-4 w-4" />
                        管理画面に戻る
                    </Button>
                </Link>
            </div>
            <SurveyClientForm
                surveyId={survey.id}
                title={survey.title}
                description={survey.description}
                questions={questions}
                isPreview={true}
            />
        </div>
    );
}

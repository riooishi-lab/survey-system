import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCompanyAuth } from "@/lib/auth";
import { getCompanySurveyResults } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import ResultsClient from "./ResultsClient";

export const dynamic = "force-dynamic";

export default async function CompanyResultsPage({ params }: { params: Promise<{ id: string }> }) {
    await requireCompanyAuth();
    const { id } = await params;
    const { data: survey, error } = await getCompanySurveyResults(id);

    if (error || !survey) return notFound();

    const responses = survey.responses || [];
    const questions = survey.questions || [];
    const totalResponses = responses.length;

    // Build per-question stats
    const questionStats = questions.map((q: any) => {
        const allAnswers = responses.flatMap((r: any) =>
            (r.answers || []).filter((a: any) => a.question_id === q.id)
        );

        if (q.type === "score") {
            const scoreAnswers = allAnswers.filter((a: any) => a.score !== null);
            const avg = scoreAnswers.length > 0
                ? scoreAnswers.reduce((sum: number, a: any) => sum + a.score, 0) / scoreAnswers.length
                : 0;
            return { ...q, avg, scoreAnswers, textAnswers: [], choiceAnswers: [], choiceOptions: [] };
        } else if (q.type === "choice") {
            const choiceAnswers = allAnswers.filter((a: any) => a.text_value);
            return { ...q, avg: 0, scoreAnswers: [], textAnswers: [], choiceAnswers, choiceOptions: q.options ?? [] };
        } else {
            const textAnswers = allAnswers.filter((a: any) => a.text_value);
            return { ...q, avg: 0, scoreAnswers: [], textAnswers, choiceAnswers: [], choiceOptions: [] };
        }
    });

    const scoreQuestions = questionStats.filter((q: any) => q.type === "score" && q.scoreAnswers.length > 0);
    const overallAvg = scoreQuestions.length > 0
        ? scoreQuestions.reduce((sum: number, q: any) => sum + q.avg, 0) / scoreQuestions.length
        : 0;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/company">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-bold text-slate-900">{survey.title}</h2>
                        {survey.status === "active" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">公開中</Badge>}
                        {survey.status === "closed" && <Badge className="bg-red-100 text-red-700 border-red-200">終了</Badge>}
                        {survey.status === "draft" && <Badge className="bg-slate-100 text-slate-600 border-slate-200">下書き</Badge>}
                    </div>
                    <p className="text-slate-500 mt-1 text-sm">回答結果の分析</p>
                </div>
            </div>

            {totalResponses === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500">まだ回答がありません</p>
                </div>
            ) : (
                <ResultsClient
                    survey={survey}
                    questionStats={questionStats}
                    totalResponses={totalResponses}
                    overallAvg={overallAvg}
                />
            )}
        </div>
    );
}

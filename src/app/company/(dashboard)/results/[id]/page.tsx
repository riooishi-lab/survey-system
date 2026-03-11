import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCompanyAuth } from "@/lib/auth";
import { getCompanySurveyResults } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Calendar, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
    const pct = Math.round((score / max) * 100);
    const color =
        score >= 4 ? "bg-emerald-500" :
        score >= 3 ? "bg-blue-500" :
        score >= 2 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-700 w-8 text-right">{score.toFixed(1)}</span>
        </div>
    );
}

function ScoreDistribution({ answers }: { answers: { score: number }[] }) {
    const counts = [1, 2, 3, 4, 5].map((v) => answers.filter((a) => a.score === v).length);
    const max = Math.max(...counts, 1);

    return (
        <div className="flex items-end gap-1.5 h-12">
            {counts.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                        className="w-full rounded-sm bg-indigo-200"
                        style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? "4px" : "0" }}
                    />
                    <span className="text-xs text-slate-400">{i + 1}</span>
                </div>
            ))}
        </div>
    );
}

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
            return { ...q, avg, scoreAnswers, textAnswers: [] };
        } else {
            const textAnswers = allAnswers.filter((a: any) => a.text_value);
            return { ...q, avg: 0, scoreAnswers: [], textAnswers };
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
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-violet-600" />
                                </div>
                                <span className="text-sm text-slate-500">総回答数</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900">{totalResponses}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="text-sm text-slate-500">総合平均スコア</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-900">
                                {overallAvg > 0 ? overallAvg.toFixed(2) : "—"}
                                <span className="text-base text-slate-400 font-normal"> / 5.0</span>
                            </p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="text-sm text-slate-500">最終回答日</span>
                            </div>
                            <p className="text-lg font-bold text-slate-900">
                                {new Date(responses[responses.length - 1]?.created_at).toLocaleString("ja-JP", {
                                    year: "numeric", month: "2-digit", day: "2-digit",
                                    hour: "2-digit", minute: "2-digit"
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Per-question Results */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">設問別スコア</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {questionStats.map((q: any, index: number) => (
                                <div key={q.id} className="p-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 shrink-0">Q{index + 1}</Badge>
                                        <p className="text-sm font-medium text-slate-800">{q.text}</p>
                                    </div>

                                    {q.type === "score" && (
                                        <div className="space-y-2 ml-9">
                                            <ScoreBar score={q.avg} />
                                            {q.scoreAnswers.length > 0 && (
                                                <div className="mt-3">
                                                    <p className="text-xs text-slate-400 mb-2">回答分布 ({q.scoreAnswers.length} 件)</p>
                                                    <ScoreDistribution answers={q.scoreAnswers} />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {q.type === "text" && (
                                        <div className="ml-9 space-y-2">
                                            <p className="text-xs text-slate-400">{q.textAnswers.length} 件の回答</p>
                                            {q.textAnswers.map((a: any, i: number) => (
                                                <div key={i} className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700 border border-slate-100">
                                                    {a.text_value}
                                                </div>
                                            ))}
                                            {q.textAnswers.length === 0 && (
                                                <p className="text-sm text-slate-400">回答なし</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

import Link from "next/link";
import { ArrowLeft, Download, Users, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = getSupabase();
    const { id } = await params;

    // Fetch survey details
    const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .single();

    if (surveyError || !survey) {
        return <div className="p-8 text-center text-red-500">アンケートが見つかりません</div>;
    }

    // Fetch responses count
    const { count: responseCount, error: responsesError } = await supabase
        .from("responses")
        .select("*", { count: "exact", head: true })
        .eq("survey_id", id);

    const totalResponses = responseCount || 0;

    // Fetch questions
    const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("survey_id", id)
        .order("order_index", { ascending: true });

    if (questionsError) {
        console.error("Error fetching questions:", questionsError);
    }

    const questionList = questions || [];

    // Fetch answers
    let answersList: { question_id: string; score: number | null; text_value: string | null; created_at: string }[] = [];
    if (questionList.length > 0) {
        const { data: answers, error: answersError } = await supabase
            .from("answers")
            .select("question_id, score, text_value, created_at")
            .in("question_id", questionList.map(q => q.id))
            .order("created_at", { ascending: false });

        if (answersError) {
            console.error("Error fetching answers:", answersError);
        }
        answersList = answers || [];
    }

    // Calculate distributions
    const results = questionList.map(q => {
        const qAnswers = answersList.filter(a => a.question_id === q.id);

        if (q.type === "text") {
            return {
                id: q.id,
                text: q.text,
                type: q.type,
                answers: qAnswers.filter(a => a.text_value).map(a => ({
                    text: a.text_value,
                    date: a.created_at
                }))
            };
        }

        const distribution = [5, 4, 3, 2, 1].map(score => ({
            score,
            count: qAnswers.filter(a => a.score === score).length
        }));

        const sum = qAnswers.reduce((acc, a) => acc + (a.score || 0), 0);
        const average = qAnswers.length > 0 ? (sum / qAnswers.length).toFixed(1) : "0.0";

        return {
            id: q.id,
            text: q.text,
            type: q.type || "score",
            average: parseFloat(average),
            distribution
        };
    });

    // Target audience is mocked for this demo as 200, since we don't have a users table yet
    const targetAudience = 200;
    const responseRate = Math.round((totalResponses / targetAudience) * 100);

    // Overall average
    const scoreResults = results.filter(r => r.type === "score");
    const validAverages = scoreResults
        .map(r => r.average)
        .filter((avg): avg is number => avg !== undefined && avg > 0);

    const overallAverage = validAverages.length > 0
        ? (validAverages.reduce((a, b) => a + b, 0) / validAverages.length).toFixed(2)
        : "0.00";

    return (
        <div className="space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900">{survey.title}</h2>
                            {survey.status === "active" && <Badge className="bg-emerald-100 text-emerald-800 border-none">公開中</Badge>}
                            {survey.status === "draft" && <Badge className="bg-slate-100 text-slate-700 border-none">下書き</Badge>}
                            {survey.status === "closed" && <Badge className="bg-red-100 text-red-800 border-none">終了</Badge>}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">アンケート集計結果</p>
                    </div>
                </div>
                <Button variant="outline" className="gap-2 bg-white">
                    <Download className="h-4 w-4" />
                    CSVダウンロード
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">回答数 / 想定対象者</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {totalResponses} <span className="text-lg text-slate-500 font-normal">/ {targetAudience}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            回答率: <span className="font-semibold text-slate-700">{responseRate}%</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">全体平均スコア</CardTitle>
                        <CheckCircle2 className={`h-4 w-4 ${parseFloat(overallAverage) >= 3.5 ? 'text-emerald-600' : 'text-amber-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{overallAverage}</div>
                        <p className={`text-xs mt-1 font-medium ${parseFloat(overallAverage) >= 3.5 ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {parseFloat(overallAverage) >= 3.5 ? "良好な状態です" : parseFloat(overallAverage) > 0 ? "改善の余地があります" : "データなし"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">残り期間</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            {survey.deadline ? new Date(survey.deadline).toLocaleDateString("ja-JP") : "無期限"}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            締切日
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Results per Question */}
            <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 px-1 pt-4">設問別集計</h3>

                {results.length === 0 && (
                    <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500">
                        設問がありません
                    </div>
                )}

                <div className="grid gap-6">
                    {results.map((result, index) => (
                        <Card key={result.id} className="shadow-sm border-slate-200">
                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
                                <div className="flex gap-4 items-start">
                                    <Badge className="bg-blue-600 text-white shrink-0 mt-0.5 px-2.5">Q{index + 1}</Badge>
                                    <CardTitle className="text-base text-slate-800 leading-snug">
                                        {result.text}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {result.type === "text" ? (
                                    <div className="space-y-4">
                                        {result.answers && result.answers.length > 0 ? (
                                            <div className="grid gap-3">
                                                {result.answers.map((answer: any, i: number) => (
                                                    <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 whitespace-pre-wrap">
                                                        {answer.text}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                                                まだ回答がありません
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        <div className="text-center md:w-48 shrink-0">
                                            <p className="text-sm text-slate-500 mb-1">平均スコア</p>
                                            <div className="text-5xl font-bold text-slate-900 mb-2">{result.average?.toFixed(1)}</div>
                                            <div className="flex justify-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <svg
                                                        key={star}
                                                        className={`w-5 h-5 ${star <= Math.round(result.average || 0) ? 'text-amber-400' : 'text-slate-200'}`}
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex-1 w-full space-y-3">
                                            {result.distribution?.map((item: any) => {
                                                const percentage = totalResponses > 0 ? Math.round((item.count / totalResponses) * 100) : 0;
                                                return (
                                                    <div key={item.score} className="flex items-center gap-3 text-sm">
                                                        <div className="w-6 font-medium text-slate-600 text-right">{item.score}</div>
                                                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${item.score >= 4 ? 'bg-blue-500' : item.score === 3 ? 'bg-slate-400' : 'bg-rose-400'}`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        <div className="w-16 text-right text-slate-600">
                                                            <span className="font-medium text-slate-900">{item.count}</span>人
                                                        </div>
                                                        <div className="w-12 text-right text-slate-400">{percentage}%</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

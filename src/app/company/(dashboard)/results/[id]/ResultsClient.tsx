"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Calendar, BarChart2, List, PieChart } from "lucide-react";

// SVG Donut Chart
function DonutChart({ counts }: { counts: number[] }) {
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center text-xs text-slate-400">データなし</div>;

    const colors = ["#ef4444", "#fb923c", "#fbbf24", "#34d399", "#818cf8"];
    let cumulative = 0;
    const radius = 40;
    const cx = 56, cy = 56;
    const circumference = 2 * Math.PI * radius;

    const slices = counts.map((count, i) => {
        const pct = count / total;
        const offset = circumference * (1 - cumulative);
        const dash = circumference * pct;
        cumulative += pct;
        return { color: colors[i], dash, offset, pct, count };
    }).filter((s) => s.count > 0);

    return (
        <div className="flex items-center gap-4">
            <svg width="112" height="112" viewBox="0 0 112 112">
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="18" />
                {slices.map((s, i) => (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="18"
                        strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                        strokeDashoffset={s.offset}
                        style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
                    />
                ))}
                <text x={cx} y={cy + 5} textAnchor="middle" className="text-xs font-bold" fill="#334155" fontSize="14" fontWeight="bold">
                    {total}
                </text>
                <text x={cx} y={cy + 18} textAnchor="middle" fill="#94a3b8" fontSize="9">件</text>
            </svg>
            <div className="space-y-1.5">
                {counts.map((count, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ["#ef4444", "#fb923c", "#fbbf24", "#34d399", "#818cf8"][i] }} />
                        <span className="text-slate-500">{i + 1}: {count}件</span>
                        {total > 0 && <span className="text-slate-400">({Math.round((count / total) * 100)}%)</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
    const pct = Math.round((score / max) * 100);
    const color = score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-blue-500" : score >= 2 ? "bg-amber-500" : "bg-red-500";
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-700 w-8 text-right">{score.toFixed(1)}</span>
        </div>
    );
}

const GENDER_LABELS: Record<string, string> = {
    male: "男性", female: "女性", other: "その他", prefer_not_to_say: "回答しない"
};
const HIRE_TYPE_LABELS: Record<string, string> = {
    new_grad: "新卒", mid_career: "中途"
};

type Props = {
    survey: any;
    questionStats: any[];
    totalResponses: number;
    overallAvg: number;
};

function AttrBar({ label, count, total }: { label: string; count: number; total: number }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 w-28 shrink-0 truncate">{label}</span>
            <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                <div className="h-full bg-indigo-400 rounded" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-500 w-20 text-right shrink-0">{count}件 ({pct}%)</span>
        </div>
    );
}

export default function ResultsClient({ survey, questionStats, totalResponses, overallAvg }: Props) {
    const [view, setView] = useState<"aggregate" | "list" | "attributes">("aggregate");
    const responses = survey.responses || [];
    const questions = survey.questions || [];

    // 属性集計の計算
    const attrResponses = responses.filter((r: any) =>
        r.respondent_department || r.respondent_gender || r.respondent_hire_type || r.respondent_join_year || r.respondent_age
    );
    const hasAttributes = attrResponses.length > 0;

    function countBy(field: string, labelMap?: Record<string, string>) {
        const counts: Record<string, number> = {};
        for (const r of responses) {
            const val = r[field];
            if (!val) continue;
            const label = labelMap ? (labelMap[val] ?? val) : String(val);
            counts[label] = (counts[label] ?? 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }

    const deptCounts = countBy("respondent_department");
    const genderCounts = countBy("respondent_gender", GENDER_LABELS);
    const hireTypeCounts = countBy("respondent_hire_type", HIRE_TYPE_LABELS);
    const joinYearCounts = countBy("respondent_join_year");
    const ageCounts = countBy("respondent_age");

    return (
        <div className="space-y-6">
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

            {/* View Toggle */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setView("aggregate")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        view === "aggregate"
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    <BarChart2 className="w-4 h-4" />
                    集計表示
                </button>
                <button
                    onClick={() => setView("attributes")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        view === "attributes"
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    <PieChart className="w-4 h-4" />
                    属性集計
                </button>
                <button
                    onClick={() => setView("list")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        view === "list"
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                    <List className="w-4 h-4" />
                    回答者別
                </button>
            </div>

            {/* Aggregate View */}
            {view === "aggregate" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900">設問別結果</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {questionStats.map((q: any, index: number) => (
                            <div key={q.id} className="p-5">
                                <div className="flex items-start gap-3 mb-4">
                                    <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 shrink-0">Q{index + 1}</Badge>
                                    <p className="text-sm font-medium text-slate-800">{q.text}</p>
                                </div>

                                {q.type === "score" && (
                                    <div className="ml-9 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 mb-1">平均スコア ({q.scoreAnswers.length} 件)</p>
                                                <ScoreBar score={q.avg} />
                                            </div>
                                        </div>
                                        {q.scoreAnswers.length > 0 && (
                                            <div>
                                                <p className="text-xs text-slate-400 mb-3">回答分布</p>
                                                <DonutChart counts={[1, 2, 3, 4, 5].map((v) => q.scoreAnswers.filter((a: any) => a.score === v).length)} />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {q.type === "choice" && q.choiceAnswers.length > 0 && (
                                    <div className="ml-9">
                                        <p className="text-xs text-slate-400 mb-3">選択結果 ({q.choiceAnswers.length} 件)</p>
                                        <div className="space-y-2">
                                            {q.choiceOptions.map((opt: string, oi: number) => {
                                                const cnt = q.choiceAnswers.filter((a: any) => a.text_value === opt).length;
                                                const pct = q.choiceAnswers.length > 0 ? Math.round((cnt / q.choiceAnswers.length) * 100) : 0;
                                                return (
                                                    <div key={oi} className="flex items-center gap-3">
                                                        <span className="text-sm text-slate-600 w-32 truncate">{opt}</span>
                                                        <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                                                            <div className="h-full bg-indigo-400 rounded" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-slate-500 w-16 text-right">{cnt}件 ({pct}%)</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
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
                                        {q.textAnswers.length === 0 && <p className="text-sm text-slate-400">回答なし</p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Attributes Aggregate View */}
            {view === "attributes" && (
                <div className="space-y-4">
                    {!hasAttributes ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500 text-sm">
                            属性情報が収集されていません（匿名サーベイまたは属性収集が無効）
                        </div>
                    ) : (
                        <>
                            {deptCounts.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4">部署</h3>
                                    <div className="space-y-2">
                                        {deptCounts.map(([label, count]) => (
                                            <AttrBar key={label} label={label} count={count} total={totalResponses} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {genderCounts.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4">性別</h3>
                                    <div className="space-y-2">
                                        {genderCounts.map(([label, count]) => (
                                            <AttrBar key={label} label={label} count={count} total={totalResponses} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {hireTypeCounts.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4">入社区分</h3>
                                    <div className="space-y-2">
                                        {hireTypeCounts.map(([label, count]) => (
                                            <AttrBar key={label} label={label} count={count} total={totalResponses} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {joinYearCounts.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4">入社年度</h3>
                                    <div className="space-y-2">
                                        {joinYearCounts.map(([label, count]) => (
                                            <AttrBar key={label} label={`${label}年`} count={count} total={totalResponses} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            {ageCounts.length > 0 && (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <h3 className="font-semibold text-slate-900 mb-4">年齢</h3>
                                    <div className="space-y-2">
                                        {ageCounts.map(([label, count]) => (
                                            <AttrBar key={label} label={`${label}歳`} count={count} total={totalResponses} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Per-Respondent List View */}
            {view === "list" && (
                <div className="space-y-4">
                    {responses.map((response: any, ri: number) => {
                        const nameLabel = response.respondent_name
                            ?? (survey.is_anonymous ? `回答者 ${ri + 1}` : `回答者 ${ri + 1}`);
                        return (
                            <div key={response.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                                            {ri + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{nameLabel}</p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(response.created_at).toLocaleString("ja-JP", {
                                                    year: "numeric", month: "2-digit", day: "2-digit",
                                                    hour: "2-digit", minute: "2-digit"
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {response.respondent_department && (
                                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">{response.respondent_department}</span>
                                        )}
                                        {response.respondent_age && (
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{response.respondent_age}歳</span>
                                        )}
                                        {response.respondent_gender && (
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{GENDER_LABELS[response.respondent_gender] ?? response.respondent_gender}</span>
                                        )}
                                        {response.respondent_join_year && (
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{response.respondent_join_year}年入社</span>
                                        )}
                                        {response.respondent_hire_type && (
                                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{HIRE_TYPE_LABELS[response.respondent_hire_type] ?? response.respondent_hire_type}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {questions.map((q: any, qi: number) => {
                                        const answer = (response.answers || []).find((a: any) => a.question_id === q.id);
                                        return (
                                            <div key={q.id} className="px-5 py-3 flex gap-3 items-start">
                                                <Badge className="bg-slate-100 text-slate-500 border-slate-200 shrink-0 text-xs">Q{qi + 1}</Badge>
                                                <div className="flex-1">
                                                    <p className="text-xs text-slate-500 mb-1">{q.text}</p>
                                                    {answer ? (
                                                        q.type === "score" ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-indigo-700">{answer.score}</span>
                                                                <span className="text-xs text-slate-400">/ 5</span>
                                                                <span className="text-xs text-slate-500 ml-1">
                                                                    {ratingOptions.find(r => r.value === String(answer.score))?.label}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{answer.text_value ?? "—"}</p>
                                                        )
                                                    ) : (
                                                        <p className="text-xs text-slate-400">未回答</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const ratingOptions = [
    { value: "1", label: "全くそう思わない" },
    { value: "2", label: "そう思わない" },
    { value: "3", label: "どちらとも言えない" },
    { value: "4", label: "そう思う" },
    { value: "5", label: "非常にそう思う" },
];

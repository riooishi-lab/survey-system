"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Calendar, BarChart2, List, Filter, X, Tag } from "lucide-react";

const GENRES = ["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"] as const;
type Genre = typeof GENRES[number] | "";

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

type FilterState = {
    department: string;
    gender: string;
    hire_type: string;
    join_year: string;
    age: string;
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

function computeStats(responses: any[], questions: any[]) {
    return questions.map((q: any) => {
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
}

const ratingOptions = [
    { value: "1", label: "全くそう思わない" },
    { value: "2", label: "そう思わない" },
    { value: "3", label: "どちらとも言えない" },
    { value: "4", label: "そう思う" },
    { value: "5", label: "非常にそう思う" },
];

export default function MasterResultsClient({ survey, questionStats, totalResponses, overallAvg }: Props) {
    const [view, setView] = useState<"aggregate" | "list">("aggregate");
    const [filters, setFilters] = useState<FilterState>({
        department: "", gender: "", hire_type: "", join_year: "", age: ""
    });
    const [showFilter, setShowFilter] = useState(false);
    const [genreFilter, setGenreFilter] = useState<Genre>("");

    const responses = survey.responses || [];
    const questions = survey.questions || [];

    const uniqueDepts = useMemo(() =>
        [...new Set<string>(responses.map((r: any) => r.respondent_department).filter(Boolean))].sort(),
        [responses]
    );
    const uniqueGenders = useMemo(() =>
        [...new Set<string>(responses.map((r: any) => r.respondent_gender).filter(Boolean))],
        [responses]
    );
    const uniqueHireTypes = useMemo(() =>
        [...new Set<string>(responses.map((r: any) => r.respondent_hire_type).filter(Boolean))],
        [responses]
    );
    const uniqueJoinYears = useMemo(() =>
        [...new Set<number>(responses.map((r: any) => r.respondent_join_year).filter(Boolean))].sort((a, b) => b - a),
        [responses]
    );
    const uniqueAges = useMemo(() =>
        [...new Set<number>(responses.map((r: any) => r.respondent_age).filter(Boolean))].sort((a, b) => a - b),
        [responses]
    );

    const hasAnyAttrData = uniqueDepts.length > 0 || uniqueGenders.length > 0 || uniqueHireTypes.length > 0 || uniqueJoinYears.length > 0 || uniqueAges.length > 0;

    const filteredResponses = useMemo(() => {
        return responses.filter((r: any) => {
            if (filters.department && r.respondent_department !== filters.department) return false;
            if (filters.gender && r.respondent_gender !== filters.gender) return false;
            if (filters.hire_type && r.respondent_hire_type !== filters.hire_type) return false;
            if (filters.join_year && String(r.respondent_join_year) !== filters.join_year) return false;
            if (filters.age && String(r.respondent_age) !== filters.age) return false;
            return true;
        });
    }, [responses, filters]);

    const isFiltered = Object.values(filters).some(Boolean);
    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const activeStats = useMemo(() => {
        if (!isFiltered) return questionStats;
        return computeStats(filteredResponses, questions);
    }, [filteredResponses, questions, isFiltered, questionStats]);

    const activeOverallAvg = useMemo(() => {
        const scoreQs = activeStats.filter((q: any) => q.type === "score" && q.scoreAnswers.length > 0);
        return scoreQs.length > 0
            ? scoreQs.reduce((sum: number, q: any) => sum + q.avg, 0) / scoreQs.length
            : 0;
    }, [activeStats]);

    const genreFilteredStats = useMemo(() => {
        if (!genreFilter) return activeStats;
        return activeStats.filter((q: any) => q.genre === genreFilter);
    }, [activeStats, genreFilter]);

    const genreAvgByType = useMemo(() => {
        const result: Record<string, number> = {};
        for (const g of GENRES) {
            const qs = activeStats.filter((q: any) => q.genre === g && q.type === "score" && q.scoreAnswers.length > 0);
            result[g] = qs.length > 0 ? qs.reduce((s: number, q: any) => s + q.avg, 0) / qs.length : 0;
        }
        return result;
    }, [activeStats]);

    const filteredTotal = filteredResponses.length;

    function countBy(resp: any[], field: string, labelMap?: Record<string, string>) {
        const counts: Record<string, number> = {};
        for (const r of resp) {
            const val = r[field];
            if (!val) continue;
            const label = labelMap ? (labelMap[val] ?? val) : String(val);
            counts[label] = (counts[label] ?? 0) + 1;
        }
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }

    const deptCounts = countBy(filteredResponses, "respondent_department");
    const genderCounts = countBy(filteredResponses, "respondent_gender", GENDER_LABELS);
    const hireTypeCounts = countBy(filteredResponses, "respondent_hire_type", HIRE_TYPE_LABELS);
    const joinYearCounts = countBy(filteredResponses, "respondent_join_year");
    const ageCounts = countBy(filteredResponses, "respondent_age");
    const hasAttrData = deptCounts.length > 0 || genderCounts.length > 0 || hireTypeCounts.length > 0 || joinYearCounts.length > 0 || ageCounts.length > 0;

    const clearFilters = () => setFilters({ department: "", gender: "", hire_type: "", join_year: "", age: "" });
    const selectClass = "h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400";

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Users className="w-5 h-5 text-violet-600" />
                        </div>
                        <span className="text-sm text-slate-500">{isFiltered ? "フィルター後の回答数" : "総回答数"}</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                        {isFiltered ? filteredTotal : totalResponses}
                        {isFiltered && <span className="text-base text-slate-400 font-normal"> / {totalResponses}</span>}
                    </p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-indigo-600" />
                        </div>
                        <span className="text-sm text-slate-500">総合平均スコア</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900">
                        {(isFiltered ? activeOverallAvg : overallAvg) > 0
                            ? (isFiltered ? activeOverallAvg : overallAvg).toFixed(2)
                            : "—"}
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

            {/* View Toggle + Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setView("aggregate")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "aggregate" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                    <BarChart2 className="w-4 h-4" />
                    集計表示
                </button>
                <button
                    onClick={() => setView("list")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "list" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                    <List className="w-4 h-4" />
                    回答者別
                </button>

                {/* Genre Filter */}
                <div className="flex items-center gap-1 ml-2 flex-wrap">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    {(["", ...GENRES] as const).map((g) => (
                        <button
                            key={g || "all"}
                            onClick={() => setGenreFilter(g as Genre)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                genreFilter === g
                                    ? "bg-violet-600 text-white border-violet-600"
                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        >
                            {g || "全ジャンル"}
                        </button>
                    ))}
                </div>

                {hasAnyAttrData && (
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-auto ${showFilter || isFiltered ? "bg-amber-50 border border-amber-300 text-amber-700" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                        <Filter className="w-4 h-4" />
                        フィルター
                        {activeFilterCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">{activeFilterCount}</span>
                        )}
                    </button>
                )}
            </div>

            {/* Filter Panel */}
            {showFilter && hasAnyAttrData && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-amber-800">属性フィルター</p>
                        {isFiltered && (
                            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 underline">
                                <X className="w-3 h-3" />クリア
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {uniqueDepts.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-amber-700 font-medium">部署</label>
                                <select className={selectClass} value={filters.department} onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}>
                                    <option value="">すべて</option>
                                    {uniqueDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        )}
                        {uniqueGenders.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-amber-700 font-medium">性別</label>
                                <select className={selectClass} value={filters.gender} onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value }))}>
                                    <option value="">すべて</option>
                                    {uniqueGenders.map((g) => <option key={g} value={g}>{GENDER_LABELS[g] ?? g}</option>)}
                                </select>
                            </div>
                        )}
                        {uniqueHireTypes.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-amber-700 font-medium">新卒 / 中途</label>
                                <select className={selectClass} value={filters.hire_type} onChange={(e) => setFilters(f => ({ ...f, hire_type: e.target.value }))}>
                                    <option value="">すべて</option>
                                    {uniqueHireTypes.map((h) => <option key={h} value={h}>{HIRE_TYPE_LABELS[h] ?? h}</option>)}
                                </select>
                            </div>
                        )}
                        {uniqueJoinYears.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-amber-700 font-medium">入社年度</label>
                                <select className={selectClass} value={filters.join_year} onChange={(e) => setFilters(f => ({ ...f, join_year: e.target.value }))}>
                                    <option value="">すべて</option>
                                    {uniqueJoinYears.map((y) => <option key={y} value={String(y)}>{y}年</option>)}
                                </select>
                            </div>
                        )}
                        {uniqueAges.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-amber-700 font-medium">年齢</label>
                                <select className={selectClass} value={filters.age} onChange={(e) => setFilters(f => ({ ...f, age: e.target.value }))}>
                                    <option value="">すべて</option>
                                    {uniqueAges.map((a) => <option key={a} value={String(a)}>{a}歳</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    {isFiltered && <p className="text-xs text-amber-700">{filteredTotal}件 / {totalResponses}件の回答を表示中</p>}
                </div>
            )}

            {/* Aggregate View */}
            {view === "aggregate" && (
                <div className="space-y-6">
                    {/* Genre breakdown summary */}
                    {!genreFilter && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {GENRES.map((g) => {
                                const avg = genreAvgByType[g];
                                const color = avg >= 4 ? "bg-emerald-500" : avg >= 3 ? "bg-blue-500" : avg >= 2 ? "bg-amber-500" : avg > 0 ? "bg-red-500" : "bg-slate-200";
                                return (
                                    <div
                                        key={g}
                                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm cursor-pointer hover:border-violet-300 transition-colors"
                                        onClick={() => setGenreFilter(g)}
                                    >
                                        <p className="text-xs font-medium text-slate-500 mb-2">{g}</p>
                                        {avg > 0 ? (
                                            <>
                                                <p className="text-xl font-bold text-slate-900">{avg.toFixed(2)}<span className="text-xs font-normal text-slate-400"> / 5.0</span></p>
                                                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${color}`} style={{ width: `${(avg / 5) * 100}%` }} />
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm text-slate-400">データなし</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Per-question stats */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">設問別結果</h3>
                            {(isFiltered || genreFilter) && (
                                <p className="text-xs text-amber-600 mt-1">
                                    {genreFilter && `ジャンル「${genreFilter}」フィルター中 — `}
                                    {isFiltered && `属性フィルター適用中 — ${filteredTotal}件の回答を集計`}
                                </p>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {genreFilteredStats.map((q: any, index: number) => (
                                <div key={q.id} className="p-5">
                                    <div className="flex items-start gap-3 mb-4">
                                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 shrink-0">Q{index + 1}</Badge>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800">{q.text}</p>
                                            {q.genre && (
                                                <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">{q.genre}</span>
                                            )}
                                        </div>
                                    </div>

                                    {q.type === "score" && (
                                        <div className="ml-9 space-y-4">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 mb-1">平均スコア ({q.scoreAnswers.length} 件)</p>
                                                <ScoreBar score={q.avg} />
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

                    {/* Attribute distribution */}
                    {hasAttrData && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <span className="w-1 h-4 bg-indigo-400 rounded-full inline-block" />
                                属性内訳
                                {isFiltered && <span className="text-xs font-normal text-amber-600">（フィルター後）</span>}
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {deptCounts.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <h4 className="font-medium text-slate-800 mb-3 text-sm">部署</h4>
                                        <div className="space-y-2">{deptCounts.map(([label, count]) => <AttrBar key={label} label={label} count={count} total={filteredTotal} />)}</div>
                                    </div>
                                )}
                                {genderCounts.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <h4 className="font-medium text-slate-800 mb-3 text-sm">性別</h4>
                                        <div className="space-y-2">{genderCounts.map(([label, count]) => <AttrBar key={label} label={label} count={count} total={filteredTotal} />)}</div>
                                    </div>
                                )}
                                {hireTypeCounts.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <h4 className="font-medium text-slate-800 mb-3 text-sm">入社区分</h4>
                                        <div className="space-y-2">{hireTypeCounts.map(([label, count]) => <AttrBar key={label} label={label} count={count} total={filteredTotal} />)}</div>
                                    </div>
                                )}
                                {joinYearCounts.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <h4 className="font-medium text-slate-800 mb-3 text-sm">入社年度</h4>
                                        <div className="space-y-2">{joinYearCounts.map(([label, count]) => <AttrBar key={label} label={`${label}年`} count={count} total={filteredTotal} />)}</div>
                                    </div>
                                )}
                                {ageCounts.length > 0 && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                        <h4 className="font-medium text-slate-800 mb-3 text-sm">年齢</h4>
                                        <div className="space-y-2">{ageCounts.map(([label, count]) => <AttrBar key={label} label={`${label}歳`} count={count} total={filteredTotal} />)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Per-Respondent List View */}
            {view === "list" && (
                <div className="space-y-4">
                    {(isFiltered ? filteredResponses : responses).length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">条件に一致する回答がありません</div>
                    )}
                    {(isFiltered ? filteredResponses : responses).map((response: any, ri: number) => {
                        const nameLabel = response.respondent_name ?? `回答者 ${ri + 1}`;
                        return (
                            <div key={response.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">{ri + 1}</div>
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
                                        {response.respondent_department && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">{response.respondent_department}</span>}
                                        {response.respondent_age && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{response.respondent_age}歳</span>}
                                        {response.respondent_gender && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{GENDER_LABELS[response.respondent_gender] ?? response.respondent_gender}</span>}
                                        {response.respondent_join_year && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{response.respondent_join_year}年入社</span>}
                                        {response.respondent_hire_type && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{HIRE_TYPE_LABELS[response.respondent_hire_type] ?? response.respondent_hire_type}</span>}
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

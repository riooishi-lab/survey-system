"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const GENRES = ["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"] as const;
const GENRE_COLORS: Record<string, string> = {
    "目標の魅力": "#ef4444",
    "人材の魅力": "#3b82f6",
    "活動の魅力": "#f59e0b",
    "条件の魅力": "#10b981",
};

type TrendItem = {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    deadline: string | null;
    responseCount: number;
    targetRespondents: number | null;
    overallAvg: number;
    genreAvgs: Record<string, number>;
};

type Props = {
    data: TrendItem[];
};

function TrendIcon({ current, previous }: { current: number; previous: number }) {
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return <Minus className="w-4 h-4 text-slate-400" />;
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
}

function DiffBadge({ current, previous }: { current: number; previous: number }) {
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return <span className="text-xs text-slate-400">±0</span>;
    const sign = diff > 0 ? "+" : "";
    const color = diff > 0 ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50";
    return (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
            {sign}{diff.toFixed(2)}
        </span>
    );
}

// Simple SVG line chart
function LineChart({ data, height = 200 }: { data: TrendItem[]; height?: number }) {
    const width = 600;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const allValues = data.flatMap((d) => [
        d.overallAvg,
        ...Object.values(d.genreAvgs),
    ]).filter((v) => v > 0);
    const minVal = Math.max(0, Math.min(...allValues) - 0.5);
    const maxVal = Math.min(5, Math.max(...allValues) + 0.5);
    const range = maxVal - minVal || 1;

    const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;
    const yScale = (v: number) => chartH - ((v - minVal) / range) * chartH;

    const overallPoints = data.map((d, i) => ({ x: i * xStep, y: yScale(d.overallAvg), val: d.overallAvg }));

    const genreLines = GENRES.map((genre) => ({
        genre,
        color: GENRE_COLORS[genre],
        points: data.map((d, i) => ({
            x: i * xStep,
            y: yScale(d.genreAvgs[genre] ?? 0),
            val: d.genreAvgs[genre] ?? 0,
        })).filter((p) => p.val > 0),
    }));

    const gridLines = [1, 2, 3, 4, 5].filter((v) => v >= minVal && v <= maxVal);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <g transform={`translate(${padding.left}, ${padding.top})`}>
                {/* Grid */}
                {gridLines.map((v) => (
                    <g key={v}>
                        <line x1={0} y1={yScale(v)} x2={chartW} y2={yScale(v)} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={-8} y={yScale(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{v.toFixed(1)}</text>
                    </g>
                ))}

                {/* X-axis labels */}
                {data.map((d, i) => (
                    <text
                        key={d.id}
                        x={i * xStep}
                        y={chartH + 20}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#64748b"
                    >
                        {d.title.length > 10 ? d.title.slice(0, 10) + "…" : d.title}
                    </text>
                ))}

                {/* Genre lines */}
                {genreLines.map(({ genre, color, points }) => (
                    points.length > 1 && (
                        <g key={genre}>
                            <polyline
                                points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                                fill="none"
                                stroke={color}
                                strokeWidth="1.5"
                                strokeDasharray="4 3"
                                opacity="0.6"
                            />
                            {points.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} opacity="0.6" />
                            ))}
                        </g>
                    )
                ))}

                {/* Overall line */}
                {overallPoints.length > 1 && (
                    <g>
                        <polyline
                            points={overallPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                            fill="none"
                            stroke="#4f46e5"
                            strokeWidth="2.5"
                        />
                        {overallPoints.map((p, i) => (
                            <g key={i}>
                                <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#4f46e5" strokeWidth="2" />
                                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#4f46e5">
                                    {p.val.toFixed(2)}
                                </text>
                            </g>
                        ))}
                    </g>
                )}
            </g>
        </svg>
    );
}

export default function TrendClient({ data }: Props) {
    const latestIdx = data.length - 1;
    const previousIdx = data.length - 2;

    const latestChange = useMemo(() => {
        if (data.length < 2) return null;
        return {
            overall: data[latestIdx].overallAvg - data[previousIdx].overallAvg,
            genres: Object.fromEntries(
                GENRES.map((g) => [g, (data[latestIdx].genreAvgs[g] ?? 0) - (data[previousIdx].genreAvgs[g] ?? 0)])
            ),
        };
    }, [data, latestIdx, previousIdx]);

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">全体平均（最新）</p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-indigo-600">{data[latestIdx].overallAvg.toFixed(2)}</p>
                        {latestChange && <TrendIcon current={data[latestIdx].overallAvg} previous={data[previousIdx].overallAvg} />}
                    </div>
                    {latestChange && <DiffBadge current={data[latestIdx].overallAvg} previous={data[previousIdx].overallAvg} />}
                </div>
                {GENRES.map((genre) => {
                    const currentVal = data[latestIdx].genreAvgs[genre] ?? 0;
                    const prevVal = data[previousIdx]?.genreAvgs[genre] ?? 0;
                    return (
                        <div key={genre} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <p className="text-xs text-slate-500 mb-1">{genre}</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-bold" style={{ color: GENRE_COLORS[genre] }}>
                                    {currentVal > 0 ? currentVal.toFixed(2) : "—"}
                                </p>
                                {currentVal > 0 && prevVal > 0 && <TrendIcon current={currentVal} previous={prevVal} />}
                            </div>
                            {currentVal > 0 && prevVal > 0 && <DiffBadge current={currentVal} previous={prevVal} />}
                        </div>
                    );
                })}
            </div>

            {/* Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-4">スコア推移グラフ</h3>
                <div className="flex flex-wrap gap-4 mb-4 text-xs">
                    <span className="flex items-center gap-1.5">
                        <span className="w-4 h-0.5 bg-indigo-600 inline-block rounded" /> 全体平均
                    </span>
                    {GENRES.map((g) => (
                        <span key={g} className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5 inline-block rounded" style={{ backgroundColor: GENRE_COLORS[g], opacity: 0.6 }} /> {g}
                        </span>
                    ))}
                </div>
                <LineChart data={data} />
            </div>

            {/* Detail table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">サーベイ別詳細</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="text-left px-4 py-3 text-slate-600 font-medium">サーベイ</th>
                                <th className="text-center px-3 py-3 text-slate-600 font-medium">実施日</th>
                                <th className="text-center px-3 py-3 text-slate-600 font-medium">回答数</th>
                                <th className="text-center px-3 py-3 text-slate-600 font-medium">回答率</th>
                                <th className="text-center px-3 py-3 text-slate-600 font-medium">全体平均</th>
                                {GENRES.map((g) => (
                                    <th key={g} className="text-center px-3 py-3 text-slate-600 font-medium whitespace-nowrap">{g}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, idx) => {
                                const prev = idx > 0 ? data[idx - 1] : null;
                                const responseRate = item.targetRespondents
                                    ? Math.round((item.responseCount / item.targetRespondents) * 100)
                                    : null;
                                return (
                                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{item.title}</td>
                                        <td className="px-3 py-3 text-center text-slate-600">
                                            {new Date(item.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "short" })}
                                        </td>
                                        <td className="px-3 py-3 text-center text-slate-600">{item.responseCount}</td>
                                        <td className="px-3 py-3 text-center">
                                            {responseRate != null ? (
                                                <span className={responseRate < 50 ? "text-red-600 font-medium" : "text-slate-600"}>{responseRate}%</span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="font-bold text-indigo-600">{item.overallAvg.toFixed(2)}</span>
                                                {prev && <DiffBadge current={item.overallAvg} previous={prev.overallAvg} />}
                                            </div>
                                        </td>
                                        {GENRES.map((g) => {
                                            const val = item.genreAvgs[g];
                                            const prevVal = prev?.genreAvgs[g];
                                            return (
                                                <td key={g} className="px-3 py-3 text-center">
                                                    {val != null ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <span className="font-medium text-slate-700">{val.toFixed(2)}</span>
                                                            {prevVal != null && <DiffBadge current={val} previous={prevVal} />}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

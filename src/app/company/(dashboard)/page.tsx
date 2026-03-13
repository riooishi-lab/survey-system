import Link from "next/link";
import { requireCompanyAuth } from "@/lib/auth";
import { getCompanySurveys, getCompanyInfo } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Users, Link2, BarChart2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CompanyDashboard() {
    await requireCompanyAuth();

    const [{ data: company }, { data: surveys }] = await Promise.all([
        getCompanyInfo(),
        getCompanySurveys(),
    ]);

    const surveyList = surveys || [];
    const activeSurveys = surveyList.filter((s: any) => s.status === "active").length;
    const totalResponses = surveyList.reduce((acc: number, s: any) => acc + (s.responses?.[0]?.count || 0), 0);
    const totalLinks = surveyList.reduce((acc: number, s: any) => acc + (s.survey_links?.filter((l: any) => l.is_active).length || 0), 0);

    const stats = [
        { label: "総サーベイ数", value: surveyList.length, icon: FileText, color: "bg-blue-50 text-blue-600" },
        { label: "公開中", value: activeSurveys, icon: FileText, color: "bg-emerald-50 text-emerald-600" },
        { label: "総回答数", value: totalResponses, icon: Users, color: "bg-violet-50 text-violet-600" },
        { label: "有効リンク数", value: totalLinks, icon: Link2, color: "bg-amber-50 text-amber-600" },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                        {company?.name || "ダッシュボード"}
                    </h2>
                    <p className="text-slate-500 mt-1">サーベイの管理と分析</p>
                </div>
                <Link href="/company/surveys/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <PlusCircle size={16} />
                        新規サーベイ作成
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${stat.color} mb-3`}>
                            <stat.icon size={20} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{stat.value.toLocaleString()}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Survey List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">サーベイ一覧</h3>
                </div>

                {surveyList.length === 0 ? (
                    <div className="text-center py-14">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500 mb-4">サーベイがまだありません</p>
                        <Link href="/company/surveys/new">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                                <PlusCircle size={16} />
                                最初のサーベイを作成する
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {surveyList.map((survey: any) => {
                            const responseCount = survey.responses?.[0]?.count || 0;
                            const activeLinks = (survey.survey_links || []).filter((l: any) => l.is_active);

                            return (
                                <div key={survey.id} className="p-5 hover:bg-slate-50 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <Link href={`/company/surveys/${survey.id}`} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-medium text-slate-900 truncate hover:text-indigo-600 transition-colors">{survey.title}</h4>
                                                {survey.status === "active" && (
                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">公開中</Badge>
                                                )}
                                                {survey.status === "draft" && (
                                                    <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">下書き</Badge>
                                                )}
                                                {survey.status === "closed" && (
                                                    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">終了</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1.5 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" />
                                                    {responseCount} 回答
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Link2 className="w-3.5 h-3.5" />
                                                    {activeLinks.length} 有効リンク
                                                </span>
                                                {survey.deadline && (
                                                    <span>期限: {new Date(survey.deadline).toLocaleDateString("ja-JP")}</span>
                                                )}
                                            </div>
                                        </Link>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link href={`/company/surveys/${survey.id}`}>
                                                <Button variant="outline" size="sm" className="gap-1 text-slate-600 shadow-none">
                                                    <Link2 className="w-3.5 h-3.5" />
                                                    リンク
                                                </Button>
                                            </Link>
                                            <Link href={`/company/results/${survey.id}`}>
                                                <Button variant="outline" size="sm" className="gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-none">
                                                    <BarChart2 className="w-3.5 h-3.5" />
                                                    結果
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

import Link from "next/link";
import { getSupabase } from "@/lib/supabase-server";
import { requireMasterAuth } from "@/lib/auth";
import { Building2, FileText, Users, TrendingUp, PlusCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function MasterDashboard() {
    await requireMasterAuth();
    const supabase = getSupabase();

    const [{ data: companies }, { count: totalSurveys }, { count: totalResponses }] = await Promise.all([
        supabase
            .from("companies")
            .select("id, name, email, status, created_at, surveys(id, status, responses(count))")
            .order("created_at", { ascending: false })
            .limit(5),
        supabase.from("surveys").select("*", { count: "exact", head: true }).not("company_id", "is", null),
        supabase.from("responses").select("*", { count: "exact", head: true }),
    ]);

    const companyList = companies || [];
    const activeCompanies = companyList.filter((c) => c.status === "active").length;

    const stats = [
        {
            label: "企業数",
            value: companyList.length,
            icon: Building2,
            color: "bg-blue-50 text-blue-600",
        },
        {
            label: "アクティブ企業",
            value: activeCompanies,
            icon: TrendingUp,
            color: "bg-emerald-50 text-emerald-600",
        },
        {
            label: "総サーベイ数",
            value: totalSurveys ?? 0,
            icon: FileText,
            color: "bg-violet-50 text-violet-600",
        },
        {
            label: "総回答数",
            value: totalResponses ?? 0,
            icon: Users,
            color: "bg-amber-50 text-amber-600",
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">ダッシュボード</h2>
                    <p className="text-slate-500 mt-1">全企業の概況</p>
                </div>
                <Link href="/master/companies/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <PlusCircle size={16} />
                        企業アカウント発行
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

            {/* Recent Companies */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">最近の企業</h3>
                    <Link href="/master/companies" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                        すべて見る <ArrowRight size={14} />
                    </Link>
                </div>
                <div className="divide-y divide-slate-100">
                    {companyList.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p>企業アカウントがありません</p>
                            <Link href="/master/companies/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
                                最初の企業を追加する
                            </Link>
                        </div>
                    ) : (
                        companyList.map((company) => {
                            const surveys = (company.surveys as any[]) || [];
                            const totalResp = surveys.reduce((acc: number, s: any) => {
                                return acc + (s.responses?.[0]?.count || 0);
                            }, 0);

                            return (
                                <div key={company.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                                            {company.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{company.name}</p>
                                            <p className="text-sm text-slate-500">{company.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-medium text-slate-900">{surveys.length} サーベイ</p>
                                            <p className="text-xs text-slate-500">{totalResp} 回答</p>
                                        </div>
                                        <Badge
                                            className={company.status === "active"
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                : "bg-slate-100 text-slate-600 border-slate-200"
                                            }
                                        >
                                            {company.status === "active" ? "有効" : "無効"}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

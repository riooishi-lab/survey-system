import Link from "next/link";
import { getSupabase } from "@/lib/supabase-server";
import { requireMasterAuth } from "@/lib/auth";
import { Building2, PlusCircle, Mail, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompanyStatusToggle from "./CompanyStatusToggle";
import CompanyDeleteButton from "./CompanyDeleteButton";

export const dynamic = "force-dynamic";

export default async function MasterCompaniesPage() {
    await requireMasterAuth();
    const supabase = getSupabase();

    const { data: companies } = await supabase
        .from("companies")
        .select(`
            *,
            surveys (
                id,
                status,
                responses (count)
            )
        `)
        .order("created_at", { ascending: false });

    const companyList = companies || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">企業アカウント管理</h2>
                    <p className="text-slate-500 mt-1">登録企業の一覧とアクセス情報</p>
                </div>
                <Link href="/master/companies/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                        <PlusCircle size={16} />
                        新規企業発行
                    </Button>
                </Link>
            </div>

            <div className="space-y-4">
                {companyList.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">企業アカウントがまだありません</p>
                        <Link href="/master/companies/new" className="text-blue-600 text-sm mt-2 inline-block hover:underline">
                            最初の企業を追加する
                        </Link>
                    </div>
                ) : (
                    companyList.map((company) => {
                        const surveys = (company.surveys as any[]) || [];
                        const activeSurveys = surveys.filter((s: any) => s.status === "active").length;
                        const totalResponses = surveys.reduce((acc: number, s: any) => acc + (s.responses?.[0]?.count || 0), 0);

                        return (
                            <div key={company.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg shrink-0">
                                                {company.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-slate-900 text-lg">{company.name}</h3>
                                                </div>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-sm text-slate-500">{company.email}</span>
                                                </div>
                                                {company.contact_name && (
                                                    <p className="text-sm text-slate-500 mt-0.5">担当: {company.contact_name}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <CompanyStatusToggle
                                                companyId={company.id}
                                                currentStatus={company.status}
                                            />
                                            <CompanyDeleteButton
                                                companyId={company.id}
                                                companyName={company.name}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span>サーベイ: <strong className="text-slate-900">{surveys.length}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <FileText className="w-4 h-4 text-emerald-400" />
                                            <span>公開中: <strong className="text-slate-900">{activeSurveys}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Users className="w-4 h-4 text-slate-400" />
                                            <span>総回答数: <strong className="text-slate-900">{totalResponses}</strong></span>
                                        </div>
                                    </div>

                                    {/* Access Token */}
                                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1 font-medium">アクセストークン（企業ログイン用）</p>
                                        <p className="font-mono text-sm text-slate-700 break-all">{company.access_token}</p>
                                    </div>

                                    <p className="text-xs text-slate-400 mt-2">
                                        登録日: {new Date(company.created_at).toLocaleDateString("ja-JP")}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

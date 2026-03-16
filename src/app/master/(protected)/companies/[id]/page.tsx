import { notFound } from "next/navigation";
import Link from "next/link";
import { requireMasterAuth } from "@/lib/auth";
import { getMasterCompany } from "@/app/actions/master";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, FileText, Users, Calendar, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MasterCompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await requireMasterAuth();
    const { id } = await params;
    const { data: company, error } = await getMasterCompany(id);

    if (error || !company) return notFound();

    const surveys = (company.surveys as any[]) || [];
    const activeSurveys = surveys.filter((s: any) => s.status === "active").length;
    const totalResponses = surveys.reduce((acc: number, s: any) => acc + (s.responses?.[0]?.count || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/master">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900">{company.name}</h2>
                    <p className="text-slate-500 mt-1 text-sm">企業詳細</p>
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

            {/* Company Info */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="font-semibold text-slate-900">基本情報</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{company.email}</span>
                    </div>
                    {company.contact_name && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span>担当: {company.contact_name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>登録日: {new Date(company.created_at).toLocaleDateString("ja-JP")}</span>
                    </div>
                    {company.login_id && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="text-slate-400 text-xs">ログインID:</span>
                            <span>{company.login_id}</span>
                        </div>
                    )}
                </div>

                {/* Access Token */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1 font-medium">アクセストークン（企業ログイン用）</p>
                    <p className="font-mono text-sm text-slate-700 break-all">{company.access_token}</p>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 pt-2 border-t border-slate-100">
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
            </div>

            {/* Surveys List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">サーベイ一覧</h3>
                </div>
                {surveys.length === 0 ? (
                    <div className="p-10 text-center text-slate-500 text-sm">
                        <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p>サーベイがありません</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {surveys.map((survey: any) => {
                            const respCount = survey.responses?.[0]?.count ?? 0;
                            return (
                                <Link
                                    key={survey.id}
                                    href={`/master/companies/${company.id}/surveys/${survey.id}`}
                                    className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div>
                                            <p className="font-medium text-slate-900">{survey.title}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-slate-500">
                                                    {new Date(survey.created_at).toLocaleDateString("ja-JP")}
                                                </span>
                                                {survey.deadline && (
                                                    <span className="text-xs text-slate-500">
                                                        期限: {new Date(survey.deadline).toLocaleDateString("ja-JP")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-900">{respCount} 件</p>
                                            <p className="text-xs text-slate-400">回答</p>
                                        </div>
                                        <Badge
                                            className={
                                                survey.status === "active"
                                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                    : survey.status === "closed"
                                                    ? "bg-red-100 text-red-700 border-red-200"
                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                            }
                                        >
                                            {survey.status === "active" ? "公開中" : survey.status === "closed" ? "終了" : "下書き"}
                                        </Badge>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

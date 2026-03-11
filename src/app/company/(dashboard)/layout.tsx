import Link from "next/link";
import { requireCompanyAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase-server";
import { companyLogout } from "@/app/actions/company-survey";
import { LayoutDashboard, FileText, LogOut, Building2 } from "lucide-react";

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
    const companyId = await requireCompanyAuth();
    const supabase = getSupabase();

    const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-indigo-950 text-indigo-200 md:min-h-screen p-4 flex flex-col">
                <div className="mb-8 px-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-sm font-bold text-white leading-none truncate">
                            {company?.name || "企業管理画面"}
                        </h1>
                        <p className="text-xs text-indigo-500 mt-0.5">企業管理ポータル</p>
                    </div>
                </div>

                <nav className="space-y-1 flex-1">
                    <Link
                        href="/company"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-900 hover:text-white transition-colors"
                    >
                        <LayoutDashboard size={18} />
                        ダッシュボード
                    </Link>
                    <Link
                        href="/company/surveys/new"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-900 hover:text-white transition-colors"
                    >
                        <FileText size={18} />
                        サーベイ作成
                    </Link>
                </nav>

                <div className="mt-auto pt-4 border-t border-indigo-800">
                    <form action={companyLogout}>
                        <button
                            type="submit"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-indigo-900 hover:text-white transition-colors w-full text-left text-indigo-400"
                        >
                            <LogOut size={18} />
                            ログアウト
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

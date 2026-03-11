import Link from "next/link";
import { requireMasterAuth } from "@/lib/auth";
import { masterLogout } from "@/app/actions/master";
import { LayoutDashboard, Building2, LogOut, Shield, ExternalLink } from "lucide-react";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
    await requireMasterAuth();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-slate-900 text-slate-300 md:min-h-screen p-4 flex flex-col">
                <div className="mb-8 px-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white leading-none">マスター管理</h1>
                        <p className="text-xs text-slate-500 mt-0.5">システム管理者</p>
                    </div>
                </div>

                <nav className="space-y-1 flex-1">
                    <Link
                        href="/master"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <LayoutDashboard size={18} />
                        ダッシュボード
                    </Link>
                    <Link
                        href="/master/companies"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <Building2 size={18} />
                        企業アカウント管理
                    </Link>
                </nav>

                <div className="pt-4 border-t border-slate-700">
                    <Link
                        href="/company/login"
                        target="_blank"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors text-slate-400 text-sm"
                    >
                        <ExternalLink size={16} />
                        企業ログイン画面
                    </Link>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-700">
                    <form action={masterLogout}>
                        <button
                            type="submit"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors w-full text-left text-slate-400"
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

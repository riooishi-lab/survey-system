import Link from "next/link";
import { LayoutDashboard, FileText, Settings, Users } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-slate-900 text-slate-300 md:min-h-screen p-4 flex flex-col">
                <div className="mb-8 px-2">
                    <h1 className="text-xl font-bold text-white">Survey Admin</h1>
                    <p className="text-xs text-slate-500 mt-1">管理画面</p>
                </div>

                <nav className="space-y-1 flex-1">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600 text-white font-medium"
                    >
                        <LayoutDashboard size={20} />
                        ダッシュボード
                    </Link>
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <FileText size={20} />
                        アンケート管理
                    </Link>
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <Users size={20} />
                        ユーザー管理
                    </Link>
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                        <Settings size={20} />
                        設定
                    </Link>
                </nav>
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

import { requireCompanyAuth } from "@/lib/auth";
import { getCompanyUsers, getCompanyDepartmentOptions } from "@/app/actions/company-survey";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function CompanyUsersPage() {
    await requireCompanyAuth();
    const [{ data: users, error }, departments] = await Promise.all([
        getCompanyUsers(),
        getCompanyDepartmentOptions(),
    ]);

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/company">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold text-slate-900">ユーザー管理</h2>
                </div>
                <p className="text-slate-500">データの取得に失敗しました</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center gap-4">
                <Link href="/company">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">ユーザー管理</h2>
                    <p className="text-slate-500 mt-1 text-sm">サーベイ結果の閲覧権限を管理</p>
                </div>
            </div>

            <UsersClient users={users || []} departments={departments} />
        </div>
    );
}

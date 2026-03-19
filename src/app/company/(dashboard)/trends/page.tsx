import { requireCompanyAuth } from "@/lib/auth";
import { getCompanyTrendData } from "@/app/actions/company-survey";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import TrendClient from "./TrendClient";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
    await requireCompanyAuth();
    const { data: trendData, error } = await getCompanyTrendData();

    if (error || !trendData) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/company">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold text-slate-900">トレンド分析</h2>
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
                    <h2 className="text-2xl font-bold text-slate-900">トレンド分析</h2>
                    <p className="text-slate-500 mt-1 text-sm">サーベイ間のスコア推移を比較</p>
                </div>
            </div>

            {trendData.length < 2 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <p className="text-slate-500">トレンド分析には公開済み・終了済みのサーベイが2つ以上必要です</p>
                    <p className="text-slate-400 text-sm mt-2">現在 {trendData.length} 件のサーベイがあります</p>
                </div>
            ) : (
                <TrendClient data={trendData} />
            )}
        </div>
    );
}

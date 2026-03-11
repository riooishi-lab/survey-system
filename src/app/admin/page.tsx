import Link from "next/link";
import { PlusCircle, Search, Edit, BarChart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getSupabase } from "@/lib/supabase-server";

// Page should be dynamic to always fetch the latest surveys
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
    const supabase = getSupabase();

    // Fetch surveys and count of responses for each survey
    const { data: surveys, error } = await supabase
        .from("surveys")
        .select(`
      *,
      responses (count)
    `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching surveys:", error);
    }

    const surveyList = surveys || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">アンケート管理</h2>
                    <p className="text-slate-500 mt-1">作成済みのアンケート一覧と結果の確認</p>
                </div>
                <Link href="/admin/new">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                        <PlusCircle size={18} />
                        新規作成
                    </Button>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input
                            placeholder="アンケートを検索..."
                            className="pl-9 bg-white"
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[300px]">タイトル</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead>回答数</TableHead>
                            <TableHead>作成日</TableHead>
                            <TableHead>期限</TableHead>
                            <TableHead className="text-right">アクション</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {surveyList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    アンケートがまだありません。「新規作成」から追加してください。
                                </TableCell>
                            </TableRow>
                        ) : (
                            surveyList.map((survey) => {
                                const responseCount = survey.responses?.[0]?.count || 0;

                                return (
                                    <TableRow key={survey.id}>
                                        <TableCell className="font-medium text-slate-900">{survey.title}</TableCell>
                                        <TableCell>
                                            {survey.status === "active" && (
                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-medium border-emerald-200">公開中</Badge>
                                            )}
                                            {survey.status === "draft" && (
                                                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium border-slate-200">下書き</Badge>
                                            )}
                                            {survey.status === "closed" && (
                                                <Badge className="bg-red-100 text-red-800 hover:bg-red-200 font-medium border-red-200">終了</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {responseCount > 0 ? (
                                                <span className="font-semibold text-slate-900">{responseCount}</span>
                                            ) : (
                                                "0"
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">{new Date(survey.created_at).toLocaleDateString("ja-JP")}</TableCell>
                                        <TableCell className="text-slate-500 text-sm">{survey.deadline ? new Date(survey.deadline).toLocaleDateString("ja-JP") : "未設定"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/admin/preview/${survey.id}`}>
                                                    <Button variant="outline" size="sm" className="h-8 shadow-none text-slate-600">
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        プレビュー
                                                    </Button>
                                                </Link>
                                                <Link href={`/admin/new?id=${survey.id}`}>
                                                    <Button variant="outline" size="sm" className="h-8 shadow-none text-slate-600">
                                                        <Edit className="h-4 w-4 mr-1" />
                                                        編集
                                                    </Button>
                                                </Link>
                                                <Link href={`/admin/results/${survey.id}`}>
                                                    <Button variant="outline" size="sm" className="h-8 shadow-none text-blue-600 border-blue-200 hover:bg-blue-50">
                                                        <BarChart className="h-4 w-4 mr-1" />
                                                        結果
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCompany } from "@/app/actions/master";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Copy, CheckCircle2 } from "lucide-react";

export default function NewCompanyPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{ name: string; email: string; access_token: string } | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const res = await createCompany(formData);

        if (res.error) {
            setError(res.error);
            setIsLoading(false);
        } else if (res.company) {
            setResult(res.company);
            setIsLoading(false);
        }
    }

    function copyToken() {
        if (result) {
            navigator.clipboard.writeText(result.access_token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    if (result) {
        return (
            <div className="max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/master/companies">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h2 className="text-2xl font-bold text-slate-900">企業アカウント発行完了</h2>
                </div>

                <Card className="border-emerald-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">{result.name} のアカウントを発行しました</p>
                                <p className="text-sm text-slate-500">{result.email}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2">
                            <p className="text-sm font-medium text-slate-700">アクセストークン（企業ログイン用）</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 font-mono text-sm text-slate-800 bg-white border border-slate-200 rounded px-3 py-2 break-all">
                                    {result.access_token}
                                </code>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={copyToken}
                                    className="shrink-0"
                                >
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800 font-medium mb-1">メール送信内容（コピーして送付してください）</p>
                            <pre className="text-xs text-amber-700 whitespace-pre-wrap font-mono">
{`件名: 【サーベイシステム】企業アカウントのご案内

${result.name} ご担当者様

この度はサーベイシステムをご利用いただきありがとうございます。
以下の情報でログインいただけます。

ログインページ: ${process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com"}/company/login
アクセストークン: ${result.access_token}

ご不明な点がございましたらお気軽にお問い合わせください。`}
                            </pre>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Link href="/master/companies/new" className="flex-1">
                                <Button variant="outline" className="w-full">続けて追加する</Button>
                            </Link>
                            <Link href="/master/companies" className="flex-1">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">一覧に戻る</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/master/companies">
                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">企業アカウント発行</h2>
                    <p className="text-slate-500 mt-1">新しい企業アカウントを作成します</p>
                </div>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">企業情報</CardTitle>
                            <CardDescription>アカウントを発行する企業の情報を入力してください</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                企業名 <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="例: 株式会社サンプル"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">
                                メールアドレス <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="例: admin@example.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="contact_name">担当者名</Label>
                            <Input
                                id="contact_name"
                                name="contact_name"
                                placeholder="例: 山田 太郎"
                            />
                        </div>

                        {error && (
                            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Link href="/master/companies" className="flex-1">
                                <Button variant="outline" type="button" className="w-full">キャンセル</Button>
                            </Link>
                            <Button
                                type="submit"
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? "発行中..." : "アカウントを発行する"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

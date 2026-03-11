"use client";

import { useState } from "react";
import { setupCompanyCredentials } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, ShieldCheck } from "lucide-react";

export default function CompanySetupPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await setupCompanyCredentials(formData);

        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">初回セットアップ</h1>
                    <p className="text-indigo-300 mt-1 text-sm">ログインIDとパスワードを設定してください</p>
                </div>

                <Card className="bg-indigo-950/50 border-indigo-800 shadow-2xl backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">アカウント設定</CardTitle>
                        <CardDescription className="text-indigo-300">
                            次回以降はこのメールアドレスとパスワードでログインできます。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="login_id" className="text-indigo-200">
                                    ログインID（メールアドレス）
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                    <Input
                                        id="login_id"
                                        name="login_id"
                                        type="email"
                                        placeholder="example@company.com"
                                        className="pl-9 bg-indigo-900/50 border-indigo-700 text-white placeholder:text-indigo-500 focus-visible:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-indigo-200">パスワード</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="8文字以上で設定してください"
                                        className="pl-9 bg-indigo-900/50 border-indigo-700 text-white placeholder:text-indigo-500 focus-visible:ring-indigo-500"
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password_confirm" className="text-indigo-200">
                                    パスワード（確認）
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                    <Input
                                        id="password_confirm"
                                        name="password_confirm"
                                        type="password"
                                        placeholder="もう一度入力してください"
                                        className="pl-9 bg-indigo-900/50 border-indigo-700 text-white placeholder:text-indigo-500 focus-visible:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                    {error}
                                </p>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                                disabled={isLoading}
                            >
                                {isLoading ? "設定中..." : "設定して管理画面へ"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

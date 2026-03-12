"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Mail } from "lucide-react";

export default function ResetPasswordPage() {
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await requestPasswordReset(formData);

        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        } else {
            setSuccess(true);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                        <Building2 className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">パスワードのリセット</h1>
                    <p className="text-indigo-300 mt-1 text-sm">パスワードを再設定します</p>
                </div>

                <Card className="bg-indigo-950/50 border-indigo-800 shadow-2xl backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">パスワードリセット申請</CardTitle>
                        <CardDescription className="text-indigo-300">
                            登録済みのメールアドレスを入力してください。
                            パスワード再設定用のリンクをメールで送信します。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {success ? (
                            <div className="space-y-4">
                                <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
                                    <p className="font-medium mb-1">メールを送信しました</p>
                                    <p>パスワード再設定用のリンクをメールで送信しました。メールをご確認ください。</p>
                                    <p className="mt-2 text-xs text-emerald-500">※リンクの有効期限は1時間です</p>
                                </div>
                                <div className="text-center">
                                    <Link
                                        href="/company/login"
                                        className="text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
                                    >
                                        ← ログイン画面に戻る
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-indigo-200">メールアドレス</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="example@company.com"
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
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "送信中..." : "リセットメールを送信"}
                                </Button>

                                <div className="text-center pt-2 border-t border-indigo-800">
                                    <Link
                                        href="/company/login"
                                        className="text-xs text-indigo-400 hover:text-indigo-200 transition-colors"
                                    >
                                        ← ログイン画面に戻る
                                    </Link>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

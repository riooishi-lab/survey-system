"use client";

import { useState } from "react";
import { companyLogin } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Building2 } from "lucide-react";

export default function CompanyLoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await companyLogin(formData);

        if (result?.error) {
            setError(result.error);
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
                        <Building2 className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">企業管理画面</h1>
                    <p className="text-indigo-300 mt-1 text-sm">アクセストークンでログインしてください</p>
                </div>

                <Card className="bg-indigo-950/50 border-indigo-800 shadow-2xl backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-white text-lg">ログイン</CardTitle>
                        <CardDescription className="text-indigo-300">
                            発行されたアクセストークンを入力してください
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="access_token" className="text-indigo-200">アクセストークン</Label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />
                                    <Input
                                        id="access_token"
                                        name="access_token"
                                        type="text"
                                        placeholder="発行されたトークンを入力"
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
                                {isLoading ? "ログイン中..." : "ログイン"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCompanySurvey } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";

const DEFAULT_QUESTIONS = [
    "配属された部署では、先輩後輩関係なくコミュニケーションが取れる環境ですか？",
    "配属された部署では、より良い仕事をするために、前向きな意見が出る環境ですか？",
    "配属された部署では、仕事に悩んだ際に相談できる上司やメンバーはいますか？",
    "現在の仕事に対して、給与金額に対して納得感はありますか？",
    "現在の仕事に対して、やりがいを感じられていますか？",
];

type Question = { id: string; text: string; type: "score" | "text" };

export default function NewCompanySurveyPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [deadline, setDeadline] = useState("");
    const [questions, setQuestions] = useState<Question[]>(
        DEFAULT_QUESTIONS.map((text, i) => ({ id: String(i + 1), text, type: "score" }))
    );

    const addQuestion = () => {
        setQuestions([...questions, { id: Date.now().toString(), type: "score", text: "" }]);
    };

    const updateText = (id: string, text: string) => {
        setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
    };

    const updateType = (id: string, type: "score" | "text") => {
        setQuestions(questions.map((q) => (q.id === id ? { ...q, type } : q)));
    };

    const removeQuestion = (id: string) => {
        if (questions.length <= 1) return;
        setQuestions(questions.filter((q) => q.id !== id));
    };

    const handleSave = async (status: "draft" | "active") => {
        if (!title.trim()) {
            alert("タイトルを入力してください");
            return;
        }
        const validQuestions = questions.filter((q) => q.text.trim());
        if (validQuestions.length === 0) {
            alert("少なくとも1つの設問を入力してください");
            return;
        }

        setIsSubmitting(true);
        const result = await createCompanySurvey({
            title,
            description,
            deadline,
            status,
            questions: validQuestions.map((q, i) => ({ text: q.text, type: q.type, order_index: i })),
        });

        if (result.error) {
            alert("エラーが発生しました: " + result.error);
            setIsSubmitting(false);
        } else if (result.surveyId) {
            router.push(`/company/surveys/${result.surveyId}`);
        }
    };

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/company">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">新規サーベイ作成</h2>
                        <p className="text-sm text-slate-500 mt-1">基本情報と設問を設定してください</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => handleSave("draft")} disabled={isSubmitting}>
                        下書き保存
                    </Button>
                    <Button
                        onClick={() => handleSave("active")}
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        <Save className="h-4 w-4" />
                        保存して公開
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Settings */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">基本設定</CardTitle>
                            <CardDescription>タイトルと説明を入力してください</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">タイトル <span className="text-red-500">*</span></Label>
                                <Input
                                    id="title"
                                    placeholder="例: 2024年 Q1 組織サーベイ"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">説明文</Label>
                                <Textarea
                                    id="description"
                                    placeholder="回答者へのメッセージ"
                                    className="h-24"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="deadline">回答期限</Label>
                                <Input
                                    id="deadline"
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Questions */}
                <div className="md:col-span-2">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <CardTitle className="text-lg">設問一覧</CardTitle>
                                <CardDescription>5段階評価または記述式</CardDescription>
                            </div>
                            <Button onClick={addQuestion} variant="outline" size="sm" className="gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                <Plus className="h-4 w-4" />
                                設問を追加
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {questions.map((q, index) => (
                                    <div key={q.id} className="p-4 sm:p-6 group flex gap-4 items-start hover:bg-slate-50/50 transition-colors">
                                        <Badge className="bg-indigo-600 text-white shrink-0 mt-1">Q{index + 1}</Badge>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex rounded-md" role="group">
                                                {(["score", "text"] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => updateType(q.id, type)}
                                                        className={`px-4 py-1.5 text-xs font-medium border border-slate-200 first:rounded-l-lg last:rounded-r-lg last:border-l-0 hover:bg-slate-50 transition-colors ${q.type === type ? "bg-indigo-50 text-indigo-600 border-indigo-200 z-10" : "bg-white text-slate-700"}`}
                                                    >
                                                        {type === "score" ? "5段階評価" : "記述式"}
                                                    </button>
                                                ))}
                                            </div>
                                            <Textarea
                                                value={q.text}
                                                onChange={(e) => updateText(q.id, e.target.value)}
                                                placeholder="質問文を入力してください"
                                                className="min-h-[80px] bg-white text-base resize-none focus-visible:ring-indigo-500 shadow-sm"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeQuestion(q.id)}
                                            disabled={questions.length === 1}
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSurvey, getSurvey, updateSurvey } from "../../actions/survey";

function SurveyFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const surveyId = searchParams.get("id");

    const [isLoading, setIsLoading] = useState(!!surveyId);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [deadline, setDeadline] = useState("");

    const [questions, setQuestions] = useState<{ id: string; text: string; type: "score" | "text" }[]>([
        { id: "1", type: "score", text: "配属された部署では、先輩後輩関係なくコミュニケーションが取れる環境ですか？" },
        { id: "2", type: "score", text: "配属された部署では、より良い仕事をするために、前向きな意見が出る環境ですか？" },
        { id: "3", type: "score", text: "配属された部署では、仕事に悩んだ際に相談できる上司やメンバーはいますか？" },
        { id: "4", type: "score", text: "配属された部署では、憧れ/尊敬する/目指す先輩はいますか？" },
        { id: "5", type: "score", text: "現在の仕事に対して、給与金額に対して納得感はありますか？" },
        { id: "6", type: "score", text: "現在の仕事に対して、ミスや辛いことも乗り越えて仕事に取り組みたいというやりがいを感じられていますか？" },
        { id: "7", type: "score", text: "福利厚生や研修制度に満足していますか？" },
        { id: "8", type: "score", text: "休憩場所や従業員用トイレ、更衣室など働く環境の設備は充実していますか？" },
        { id: "9", type: "score", text: "自社の事業が配属地の生活を支えている実感はありますか？" },
        { id: "10", type: "score", text: "同業他社と比較し、自社が会社として優れている点があるという実感はありますか？" },
        { id: "11", type: "score", text: "お客様に対して自身の仕事が貢献している、役に立っている実感はありますか？" },
        { id: "12", type: "score", text: "仕事において、自身のスキルや能力があがっている実感はありますか？" },
        { id: "13", type: "score", text: "友人や家族など身の回りの方に、入社を報告した際の反応はよかったですか？" },
        { id: "14", type: "score", text: "入社前に会社の経営状況を鑑みて、安定している（自身の雇用が守られる）と感じましたか？" },
        { id: "15", type: "score", text: "メンバーに経営理念が浸透していると感じましたか？" },
        { id: "16", type: "score", text: "これから100年企業に向けて持続成長し続ける期待はありますか？" }
    ]);

    useEffect(() => {
        async function fetchSurvey() {
            if (!surveyId) return;

            const { data, error } = await getSurvey(surveyId);
            if (error || !data) {
                alert("アンケートの取得に失敗しました");
                router.push("/admin");
                return;
            }

            setTitle(data.title);
            setDescription(data.description || "");
            if (data.deadline) {
                // Format to YYYY-MM-DD for input[type="date"]
                const d = new Date(data.deadline);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                setDeadline(`${yyyy}-${mm}-${dd}`);
            }

            if (data.questions && data.questions.length > 0) {
                setQuestions(data.questions.map((q: any) => ({
                    id: q.id,
                    type: q.type || "score",
                    text: q.text
                })));
            }
            setIsLoading(false);
        }
        fetchSurvey();
    }, [surveyId, router]);

    const addQuestion = () => {
        setQuestions([
            ...questions,
            { id: Date.now().toString(), type: "score", text: "" }
        ]);
    };

    const updateQuestionText = (id: string, text: string) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    };

    const updateQuestionType = (id: string, type: "score" | "text") => {
        setQuestions(questions.map(q => q.id === id ? { ...q, type } : q));
    };

    const removeQuestion = (id: string) => {
        if (questions.length <= 1) return;
        setQuestions(questions.filter(q => q.id !== id));
    };

    const handleSave = async (status: "draft" | "active") => {
        if (!title.trim()) {
            alert("タイトルを入力してください");
            return;
        }

        const validQuestions = questions.filter(q => q.text.trim() !== "");
        if (validQuestions.length === 0) {
            alert("少なくとも1つの設問を入力してください");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                title,
                description,
                deadline,
                status,
                questions: validQuestions.map((q, i) => ({ id: q.id.length > 13 ? q.id : undefined, text: q.text, type: q.type, order_index: i })),
            };

            let result;
            if (surveyId) {
                result = await updateSurvey(surveyId, payload);
            } else {
                result = await createSurvey(payload);
            }

            if (result.error) {
                alert("エラーが発生しました: " + result.error);
            } else {
                alert(status === "active" ? "アンケートを公開しました！" : "下書きを保存しました");
                router.push("/admin");
            }
        } catch (e) {
            console.error(e);
            alert("通信エラーが発生しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {surveyId ? "アンケート編集" : "新規アンケート作成"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">アンケートの基本情報と設問を設定します</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => handleSave("draft")}
                        disabled={isSubmitting}
                    >
                        下書き保存
                    </Button>
                    <Button
                        onClick={() => handleSave("active")}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                        <Save className="h-4 w-4" />
                        公開する
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Settings Column */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">基本設定</CardTitle>
                            <CardDescription>アンケートのタイトルと説明を入力してください</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">タイトル <span className="text-red-500">*</span></Label>
                                <Input
                                    id="title"
                                    placeholder="例: 2024年 組織コンディションサーベイ"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">説明文</Label>
                                <Textarea
                                    id="description"
                                    placeholder="回答者への説明や回答期限などを記載します"
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

                {/* Questions Builder Column */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
                            <div className="space-y-1">
                                <CardTitle className="text-lg">設問一覧 <span className="text-red-500 text-sm font-normal">*</span></CardTitle>
                                <CardDescription>5段階評価または記述式の質問を設定します</CardDescription>
                            </div>
                            <Button onClick={addQuestion} variant="outline" size="sm" className="gap-1 border-blue-200 text-blue-700 hover:bg-blue-50">
                                <Plus className="h-4 w-4" />
                                設問を追加
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {questions.map((q, index) => (
                                    <div key={q.id} className="p-4 sm:p-6 group flex gap-4 items-start transition-colors hover:bg-slate-50/50">
                                        <Badge className="bg-blue-600 text-white shrink-0 mt-1">Q{index + 1}</Badge>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex justify-start">
                                                <div className="flex rounded-md shadow-sm" role="group">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuestionType(q.id, "score")}
                                                        className={`px-4 py-1.5 text-xs font-medium border border-slate-200 rounded-l-lg hover:bg-slate-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-600 ${q.type === 'score' ? 'bg-blue-50 text-blue-600 border-blue-200 z-10' : 'bg-white text-slate-700'}`}
                                                    >
                                                        5段階評価
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuestionType(q.id, "text")}
                                                        className={`px-4 py-1.5 text-xs font-medium border border-l-0 border-slate-200 rounded-r-lg hover:bg-slate-50 focus:z-10 focus:ring-2 focus:ring-blue-500 focus:text-blue-600 ${q.type === 'text' ? 'bg-blue-50 text-blue-600 border-blue-200 z-10' : 'bg-white text-slate-700'}`}
                                                    >
                                                        記述式
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor={`q-${q.id}`} className="sr-only">質問文 {index + 1}</Label>
                                                <Textarea
                                                    id={`q-${q.id}`}
                                                    value={q.text}
                                                    onChange={(e) => updateQuestionText(q.id, e.target.value)}
                                                    placeholder="質問文を入力してください"
                                                    className="min-h-[80px] bg-white text-base resize-none focus-visible:ring-blue-500 shadow-sm"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeQuestion(q.id)}
                                            disabled={questions.length === 1}
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                            title="設問を削除"
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
        </div >
    );
}

export default function NewSurveyPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
            <SurveyFormContent />
        </Suspense>
    );
}

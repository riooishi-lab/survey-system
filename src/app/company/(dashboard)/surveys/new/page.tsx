"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCompanySurvey, getCompanyDepartmentOptions, updateCompanySettings } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";

type RespondentFields = {
    name: boolean;
    age: boolean;
    gender: boolean;
    join_year: boolean;
    hire_type: boolean;
    department: boolean;
};

const RESPONDENT_FIELD_LABELS: Record<keyof RespondentFields, string> = {
    name: "名前",
    age: "年齢",
    gender: "性別",
    join_year: "入社年度",
    hire_type: "新卒 / 中途",
    department: "部署",
};

const DEFAULT_QUESTIONS = [
    "配属された部署では、先輩後輩関係なくコミュニケーションが取れる環境ですか？",
    "配属された部署では、より良い仕事をするために、前向きな意見が出る環境ですか？",
    "配属された部署では、仕事に悩んだ際に相談できる上司やメンバーはいますか？",
    "現在の仕事に対して、給与金額に対して納得感はありますか？",
    "現在の仕事に対して、やりがいを感じられていますか？",
];

type Question = { id: string; text: string; type: "score" | "text" | "choice"; options?: string[] };

export default function NewCompanySurveyPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [deadline, setDeadline] = useState("");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [deptOptions, setDeptOptions] = useState<string[]>([]);
    const [isSavingDept, setIsSavingDept] = useState(false);
    const [respondentFields, setRespondentFields] = useState<RespondentFields>({
        name: false,
        age: false,
        gender: false,
        join_year: false,
        hire_type: false,
        department: false,
    });

    useEffect(() => {
        getCompanyDepartmentOptions().then((opts) => setDeptOptions(opts)).catch(() => {});
    }, []);

    const addDeptOption = () => setDeptOptions([...deptOptions, ""]);
    const updateDeptOption = (i: number, val: string) =>
        setDeptOptions(deptOptions.map((o, idx) => (idx === i ? val : o)));
    const removeDeptOption = (i: number) =>
        setDeptOptions(deptOptions.length <= 1 ? [""] : deptOptions.filter((_, idx) => idx !== i));
    const handleSaveDept = async () => {
        const nonEmpty = deptOptions.map((o) => o.trim()).filter(Boolean);
        setIsSavingDept(true);
        const result = await updateCompanySettings({ department_options: nonEmpty });
        if (result.error) {
            alert("部署リストの保存に失敗しました: " + result.error);
        } else {
            setDeptOptions(nonEmpty.length > 0 ? nonEmpty : []);
            alert("部署リストを保存しました");
        }
        setIsSavingDept(false);
    };

    const [questions, setQuestions] = useState<Question[]>(
        DEFAULT_QUESTIONS.map((text, i) => ({ id: String(i + 1), text, type: "score" }))
    );

    const addQuestion = () => {
        setQuestions([...questions, { id: Date.now().toString(), type: "score", text: "" }]);
    };

    const updateText = (id: string, text: string) => {
        setQuestions(questions.map((q) => (q.id === id ? { ...q, text } : q)));
    };

    const updateType = (id: string, type: "score" | "text" | "choice") => {
        setQuestions(questions.map((q) => (q.id === id ? { ...q, type, options: type === "choice" ? (q.options ?? ["", ""]) : undefined } : q)));
    };

    const updateOption = (id: string, optIndex: number, value: string) => {
        setQuestions(questions.map((q) => q.id === id ? { ...q, options: (q.options ?? []).map((o, i) => i === optIndex ? value : o) } : q));
    };

    const addOption = (id: string) => {
        setQuestions(questions.map((q) => q.id === id ? { ...q, options: [...(q.options ?? []), ""] } : q));
    };

    const removeOption = (id: string, optIndex: number) => {
        setQuestions(questions.map((q) => q.id === id ? { ...q, options: (q.options ?? []).filter((_, i) => i !== optIndex) } : q));
    };

    const removeQuestion = (id: string) => {
        if (questions.length <= 1) return;
        setQuestions(questions.filter((q) => q.id !== id));
    };

    const toggleRespondentField = (field: keyof RespondentFields) => {
        setRespondentFields((prev) => ({ ...prev, [field]: !prev[field] }));
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

        // 選択式の選択肢バリデーション
        for (const q of validQuestions) {
            if (q.type === "choice") {
                const nonEmpty = (q.options ?? []).filter(Boolean);
                if (nonEmpty.length < 2) {
                    alert("選択式の設問には、2つ以上の選択肢を入力してください");
                    return;
                }
            }
        }

        setIsSubmitting(true);
        const fields = isAnonymous
            ? { name: false, age: false, gender: false, join_year: false, hire_type: false, department: false }
            : {
                ...respondentFields,
                // 部署が有効な場合、現在の部署リストをスナップショットとして埋め込む
                ...(respondentFields.department ? { department_options: deptOptions.filter(Boolean) } : {}),
              };
        const result = await createCompanySurvey({
            title,
            description,
            deadline,
            status,
            is_anonymous: isAnonymous,
            respondent_fields: fields,
            questions: validQuestions.map((q, i) => ({ text: q.text, type: q.type, order_index: i, options: q.options })),
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

                            {/* 匿名設定 */}
                            <div className="border-t border-slate-100 pt-4 space-y-3">
                                <Label>回答者情報</Label>
                                <div className="flex gap-2 rounded-lg border border-slate-200 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setIsAnonymous(true)}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors ${isAnonymous ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        匿名
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsAnonymous(false)}
                                        className={`flex-1 py-2 text-sm font-medium transition-colors ${!isAnonymous ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                                    >
                                        属性を収集
                                    </button>
                                </div>
                                {isAnonymous ? (
                                    <p className="text-xs text-slate-400">回答者の個人情報は収集しません。</p>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500">収集する項目を選択してください：</p>
                                        {(Object.keys(RESPONDENT_FIELD_LABELS) as (keyof RespondentFields)[]).map((field) => (
                                            <label key={field} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={respondentFields[field]}
                                                    onChange={() => toggleRespondentField(field)}
                                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                                                    {RESPONDENT_FIELD_LABELS[field]}
                                                </span>
                                            </label>
                                        ))}

                                        {/* 部署インライン編集 */}
                                        {respondentFields.department && (
                                            <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 space-y-2">
                                                <p className="text-xs font-medium text-indigo-700">部署の選択肢</p>
                                                {(deptOptions.length > 0 ? deptOptions : [""]).map((opt, i) => (
                                                    <div key={i} className="flex items-center gap-1.5">
                                                        <span className="text-xs text-slate-400 w-4 text-right shrink-0">{i + 1}.</span>
                                                        <Input
                                                            value={opt}
                                                            onChange={(e) => updateDeptOption(i, e.target.value)}
                                                            placeholder="例: 営業部"
                                                            className="h-7 text-xs"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDeptOption(i)}
                                                            className="text-slate-400 hover:text-red-500 shrink-0"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="flex items-center justify-between pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={addDeptOption}
                                                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        <Plus className="h-3 w-3" /> 部署を追加
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveDept}
                                                        disabled={isSavingDept}
                                                        className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded disabled:opacity-50"
                                                    >
                                                        {isSavingDept ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                                {(["score", "text", "choice"] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => updateType(q.id, type)}
                                                        className={`px-4 py-1.5 text-xs font-medium border border-slate-200 first:rounded-l-lg last:rounded-r-lg last:border-l-0 hover:bg-slate-50 transition-colors ${q.type === type ? "bg-indigo-50 text-indigo-600 border-indigo-200 z-10" : "bg-white text-slate-700"}`}
                                                    >
                                                        {type === "score" ? "5段階評価" : type === "text" ? "記述式" : "選択式"}
                                                    </button>
                                                ))}
                                            </div>
                                            <Textarea
                                                value={q.text}
                                                onChange={(e) => updateText(q.id, e.target.value)}
                                                placeholder="質問文を入力してください"
                                                className="min-h-[80px] bg-white text-base resize-none focus-visible:ring-indigo-500 shadow-sm"
                                            />
                                            {q.type === "choice" && (
                                                <div className="space-y-2">
                                                    <p className="text-xs text-slate-500 font-medium">選択肢（2つ以上）</p>
                                                    {(q.options ?? []).map((opt, oi) => (
                                                        <div key={oi} className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400 w-5 text-right shrink-0">{oi + 1}.</span>
                                                            <Input
                                                                value={opt}
                                                                onChange={(e) => updateOption(q.id, oi, e.target.value)}
                                                                placeholder={`選択肢 ${oi + 1}`}
                                                                className="h-8 text-sm"
                                                            />
                                                            {(q.options ?? []).length > 2 && (
                                                                <button type="button" onClick={() => removeOption(q.id, oi)} className="text-slate-400 hover:text-red-500">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => addOption(q.id)}
                                                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        <Plus className="w-3 h-3" /> 選択肢を追加
                                                    </button>
                                                </div>
                                            )}
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

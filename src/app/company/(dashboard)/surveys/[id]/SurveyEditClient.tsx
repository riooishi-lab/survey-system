"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    updateCompanySurvey,
    updateCompanySettings,
    issueSurveyLink,
    deactivateSurveyLink,
} from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, Plus, Trash2, Save, Link2, Copy, CheckCircle2,
    ExternalLink, XCircle, Loader2
} from "lucide-react";

type Question = { id?: string; text: string; type: "score" | "text" | "choice"; options?: string[] };
type SurveyLink = { id: string; token: string; is_active: boolean; expires_at: string | null; created_at: string };

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

export default function SurveyEditClient({ survey, departmentOptions = [] }: { survey: any; departmentOptions?: string[] }) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isIssuingLink, setIsIssuingLink] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // 部署リスト（インライン編集用）
    const [deptOptions, setDeptOptions] = useState<string[]>(
        departmentOptions.length > 0 ? departmentOptions : []
    );
    const [isSavingDept, setIsSavingDept] = useState(false);

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

    const [title, setTitle] = useState(survey.title);
    const [description, setDescription] = useState(survey.description || "");
    const [deadline, setDeadline] = useState(() => {
        if (!survey.deadline) return "";
        const d = new Date(survey.deadline);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const [status, setStatus] = useState<"draft" | "active" | "closed">(survey.status);
    const [isAnonymous, setIsAnonymous] = useState<boolean>(survey.is_anonymous ?? true);
    const [respondentFields, setRespondentFields] = useState<RespondentFields>({
        name: survey.respondent_fields?.name ?? false,
        age: survey.respondent_fields?.age ?? false,
        gender: survey.respondent_fields?.gender ?? false,
        join_year: survey.respondent_fields?.join_year ?? false,
        hire_type: survey.respondent_fields?.hire_type ?? false,
        department: survey.respondent_fields?.department ?? false,
    });
    const [questions, setQuestions] = useState<Question[]>(
        (survey.questions || []).map((q: any) => ({ id: q.id, text: q.text, type: q.type, options: q.options ?? undefined }))
    );
    const [links, setLinks] = useState<SurveyLink[]>(survey.survey_links || []);

    const toggleRespondentField = (field: keyof RespondentFields) => {
        setRespondentFields((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const addQuestion = () => {
        setQuestions([...questions, { type: "score", text: "" }]);
    };

    const updateText = (index: number, text: string) => {
        setQuestions(questions.map((q, i) => (i === index ? { ...q, text } : q)));
    };

    const updateType = (index: number, type: "score" | "text" | "choice") => {
        setQuestions(questions.map((q, i) => i === index ? { ...q, type, options: type === "choice" ? (q.options ?? ["", ""]) : undefined } : q));
    };

    const updateOption = (index: number, optIndex: number, value: string) => {
        setQuestions(questions.map((q, i) => i === index ? { ...q, options: (q.options ?? []).map((o, oi) => oi === optIndex ? value : o) } : q));
    };

    const addOption = (index: number) => {
        setQuestions(questions.map((q, i) => i === index ? { ...q, options: [...(q.options ?? []), ""] } : q));
    };

    const removeOption = (index: number, optIndex: number) => {
        setQuestions(questions.map((q, i) => i === index ? { ...q, options: (q.options ?? []).filter((_, oi) => oi !== optIndex) } : q));
    };

    const removeQuestion = (index: number) => {
        if (questions.length <= 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSave = async (newStatus?: "draft" | "active" | "closed") => {
        if (!title.trim()) { alert("タイトルを入力してください"); return; }
        const validQuestions = questions.filter((q) => q.text.trim());
        if (validQuestions.length === 0) { alert("少なくとも1つの設問を入力してください"); return; }

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
                ...(respondentFields.department ? { department_options: deptOptions.filter(Boolean) } : {}),
              };
        const result = await updateCompanySurvey(survey.id, {
            title,
            description,
            deadline,
            status: newStatus || status,
            is_anonymous: isAnonymous,
            respondent_fields: fields,
            questions: validQuestions.map((q, i) => ({
                id: q.id && q.id.length > 13 ? q.id : undefined,
                text: q.text,
                type: q.type,
                order_index: i,
                options: q.options,
            })),
        });

        if (result.error) {
            alert("エラー: " + result.error);
        } else {
            if (newStatus) setStatus(newStatus);
            if (result.linksDeactivated) {
                alert("保存しました。\n\n⚠️ 設問の変更により、既存の回答リンクがすべて無効化されました。\n「回答リンク管理」から新しいリンクを発行してください。");
            } else {
                alert("保存しました");
            }
            router.refresh();
        }
        setIsSubmitting(false);
    };

    const handleIssueLink = async () => {
        setIsIssuingLink(true);
        const result = await issueSurveyLink(survey.id, deadline || undefined);
        if (result.error) {
            alert("エラー: " + result.error);
        } else if (result.token) {
            const newLink: SurveyLink = {
                id: Date.now().toString(),
                token: result.token,
                is_active: true,
                expires_at: deadline || null,
                created_at: new Date().toISOString(),
            };
            setLinks([newLink, ...links]);
        }
        setIsIssuingLink(false);
    };

    const handleDeactivate = async (linkId: string) => {
        const result = await deactivateSurveyLink(linkId);
        if (result.error) {
            alert("エラー: " + result.error);
        } else {
            setLinks(links.map((l) => l.id === linkId ? { ...l, is_active: false } : l));
        }
    };

    const copyLink = (token: string) => {
        navigator.clipboard.writeText(`${baseUrl}/survey/${token}`);
        setCopiedToken(token);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/company">
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">サーベイ編集</h2>
                        <p className="text-sm text-slate-500 mt-1">設問の編集・回答リンクの管理</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => handleSave()} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
                    </Button>
                    {status === "draft" && (
                        <Button
                            onClick={() => handleSave("active")}
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <Save className="h-4 w-4" />
                            公開する
                        </Button>
                    )}
                    {status === "active" && (
                        <Button
                            onClick={() => handleSave("closed")}
                            disabled={isSubmitting}
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                            終了する
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Settings + Links */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg">基本設定</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>タイトル</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>説明文</Label>
                                <Textarea
                                    className="h-24"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>回答期限</Label>
                                <Input
                                    type="date"
                                    value={deadline}
                                    onChange={(e) => setDeadline(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <span className="text-sm text-slate-500">ステータス:</span>
                                {status === "active" && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">公開中</Badge>}
                                {status === "draft" && <Badge className="bg-slate-100 text-slate-600 border-slate-200">下書き</Badge>}
                                {status === "closed" && <Badge className="bg-red-100 text-red-700 border-red-200">終了</Badge>}
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

                    {/* Link Management */}
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-indigo-600" />
                                回答リンク管理
                            </CardTitle>
                            <CardDescription>社員に配布するリンクを発行します</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {deadline && (
                                <p className="text-xs text-slate-500">
                                    有効期限: {new Date(deadline).toLocaleDateString("ja-JP")}（回答期限と同じ）
                                </p>
                            )}
                            <Button
                                onClick={handleIssueLink}
                                disabled={isIssuingLink || status === "closed"}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                            >
                                {isIssuingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                                リンクを発行する
                            </Button>

                            {status === "closed" && (
                                <p className="text-xs text-slate-500 text-center">終了済みサーベイへのリンク発行はできません</p>
                            )}

                            {/* Existing Links */}
                            {links.length > 0 && (
                                <div className="space-y-3 mt-2">
                                    <p className="text-sm font-medium text-slate-700">発行済みリンク ({links.length})</p>
                                    {links.map((link) => (
                                        <div
                                            key={link.id}
                                            className={`rounded-lg border p-3 ${link.is_active ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-slate-50/50 opacity-60"}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-mono text-xs text-slate-600 truncate">
                                                        /survey/{link.token}
                                                    </p>
                                                    {link.expires_at && (
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            期限: {new Date(link.expires_at).toLocaleDateString("ja-JP")}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400">
                                                        発行: {new Date(link.created_at).toLocaleString("ja-JP", {
                                                            year: "numeric", month: "2-digit", day: "2-digit",
                                                            hour: "2-digit", minute: "2-digit"
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {link.is_active && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                                                onClick={() => copyLink(link.token)}
                                                                title="URLをコピー"
                                                            >
                                                                {copiedToken === link.token
                                                                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    : <Copy className="w-3.5 h-3.5" />
                                                                }
                                                            </Button>
                                                            <a
                                                                href={`/survey/${link.token}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-900" title="リンクを開く">
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </a>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDeactivate(link.id)}
                                                                title="無効化"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {!link.is_active && (
                                                        <Badge className="text-xs bg-slate-100 text-slate-500 border-slate-200">無効</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Questions */}
                <div className="lg:col-span-2">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <CardTitle className="text-lg">設問一覧</CardTitle>
                                <CardDescription>5段階評価または記述式</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-500">{questions.length}問</span>
                                <Button onClick={addQuestion} variant="outline" size="sm" className="gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                    <Plus className="h-4 w-4" />
                                    設問を追加
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {questions.map((q, index) => (
                                    <div key={index} className="p-4 sm:p-6 group flex gap-4 items-start hover:bg-slate-50/50 transition-colors">
                                        <Badge className="bg-indigo-600 text-white shrink-0 mt-1">Q{index + 1}</Badge>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex rounded-md" role="group">
                                                {(["score", "text", "choice"] as const).map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => updateType(index, type)}
                                                        className={`px-4 py-1.5 text-xs font-medium border border-slate-200 first:rounded-l-lg last:rounded-r-lg last:border-l-0 hover:bg-slate-50 transition-colors ${q.type === type ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-white text-slate-700"}`}
                                                    >
                                                        {type === "score" ? "5段階評価" : type === "text" ? "記述式" : "選択式"}
                                                    </button>
                                                ))}
                                            </div>
                                            <Textarea
                                                value={q.text}
                                                onChange={(e) => updateText(index, e.target.value)}
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
                                                                onChange={(e) => updateOption(index, oi, e.target.value)}
                                                                placeholder={`選択肢 ${oi + 1}`}
                                                                className="h-8 text-sm"
                                                            />
                                                            {(q.options ?? []).length > 2 && (
                                                                <button type="button" onClick={() => removeOption(index, oi)} className="text-slate-400 hover:text-red-500">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        onClick={() => addOption(index)}
                                                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        <Plus className="h-3 w-3" /> 選択肢を追加
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeQuestion(index)}
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

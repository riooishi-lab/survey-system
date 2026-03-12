"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { submitSurveyResponse } from "./actions/survey";

const ratingOptions = [
    { value: "1", label: "全くそう思わない" },
    { value: "2", label: "そう思わない" },
    { value: "3", label: "どちらとも言えない" },
    { value: "4", label: "そう思う" },
    { value: "5", label: "非常にそう思う" },
];

type RespondentFieldsConfig = {
    name?: boolean;
    age?: boolean;
    gender?: boolean;
    join_year?: boolean;
    hire_type?: boolean;
};

const CURRENT_YEAR = new Date().getFullYear();
const JOIN_YEAR_OPTIONS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR - i);

export default function SurveyClientForm({
    surveyId,
    title,
    description,
    questions,
    isPreview = false,
    isAnonymous = true,
    respondentFields = {},
}: {
    surveyId: string;
    title: string;
    description: string | null;
    questions: { id: string; text: string; type: "score" | "text" | "choice"; options?: string[] }[];
    isPreview?: boolean;
    isAnonymous?: boolean;
    respondentFields?: RespondentFieldsConfig;
}) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    // 属性フィールドの state
    const [respondentName, setRespondentName] = useState("");
    const [respondentAge, setRespondentAge] = useState("");
    const [respondentGender, setRespondentGender] = useState("");
    const [respondentJoinYear, setRespondentJoinYear] = useState("");
    const [respondentHireType, setRespondentHireType] = useState("");

    const setAnswer = (questionId: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
        setErrors((prev) => ({ ...prev, [questionId]: false }));
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Validate all questions answered
        const newErrors: Record<string, boolean> = {};
        let hasError = false;
        for (const q of questions) {
            if (!answers[q.id] || answers[q.id].trim() === "") {
                newErrors[q.id] = true;
                hasError = true;
            }
        }

        // 属性フィールドのバリデーション
        if (!isAnonymous) {
            if (respondentFields.name && !respondentName.trim()) { alert("名前を入力してください"); return; }
            if (respondentFields.age && !respondentAge) { alert("年齢を入力してください"); return; }
            if (respondentFields.gender && !respondentGender) { alert("性別を選択してください"); return; }
            if (respondentFields.join_year && !respondentJoinYear) { alert("入社年度を選択してください"); return; }
            if (respondentFields.hire_type && !respondentHireType) { alert("新卒/中途を選択してください"); return; }
        }

        if (hasError) {
            setErrors(newErrors);
            // Scroll to first unanswered question
            const firstErrorId = questions.find((q) => newErrors[q.id])?.id;
            if (firstErrorId) {
                document.getElementById(`question-${firstErrorId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
        }

        if (isPreview) {
            alert("プレビューモードのため、実際のデータは送信されません。");
            return;
        }

        setIsSubmitting(true);
        try {
            const responses = questions.reduce((acc, q) => ({
                ...acc,
                [q.id]: { type: q.type, value: answers[q.id] ?? "" },
            }), {} as Record<string, { type: "score" | "text" | "choice"; value: string }>);

            const respondentData = isAnonymous ? undefined : {
                name: respondentFields.name ? respondentName.trim() : undefined,
                age: respondentFields.age ? parseInt(respondentAge, 10) : undefined,
                gender: respondentFields.gender ? respondentGender : undefined,
                join_year: respondentFields.join_year ? parseInt(respondentJoinYear, 10) : undefined,
                hire_type: respondentFields.hire_type ? respondentHireType : undefined,
            };

            const result = await submitSurveyResponse(surveyId, responses, respondentData);
            if (result.error) {
                alert("エラーが発生しました: " + result.error);
            } else {
                setIsSubmitted(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch (error) {
            console.error(error);
            alert("送信に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">回答を受け付けました</h2>
                    <p className="text-slate-500 text-sm">ご回答いただきありがとうございました。</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-4 pb-24">
                {/* タイトルカード */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-6">
                    {isPreview && (
                        <div className="mb-3">
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white">プレビュー中</Badge>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
                    {description && (
                        <p className="text-slate-600 whitespace-pre-wrap text-sm">{description}</p>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 属性フォーム（非匿名の場合のみ表示） */}
                    {!isAnonymous && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-6">
                            <p className="text-base font-semibold text-slate-900 mb-4">あなたについて</p>
                            <div className="space-y-4">
                                {respondentFields.name && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">名前</label>
                                        <input
                                            type="text"
                                            value={respondentName}
                                            onChange={(e) => setRespondentName(e.target.value)}
                                            placeholder="山田 太郎"
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                                {respondentFields.age && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">年齢</label>
                                        <input
                                            type="number"
                                            value={respondentAge}
                                            onChange={(e) => setRespondentAge(e.target.value)}
                                            placeholder="30"
                                            min={15}
                                            max={80}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                                {respondentFields.gender && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">性別</label>
                                        <select
                                            value={respondentGender}
                                            onChange={(e) => setRespondentGender(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        >
                                            <option value="">選択してください</option>
                                            <option value="male">男性</option>
                                            <option value="female">女性</option>
                                            <option value="other">その他</option>
                                            <option value="prefer_not_to_say">回答しない</option>
                                        </select>
                                    </div>
                                )}
                                {respondentFields.join_year && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">入社年度</label>
                                        <select
                                            value={respondentJoinYear}
                                            onChange={(e) => setRespondentJoinYear(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        >
                                            <option value="">選択してください</option>
                                            {JOIN_YEAR_OPTIONS.map((year) => (
                                                <option key={year} value={year}>{year}年</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {respondentFields.hire_type && (
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">入社区分</label>
                                        <select
                                            value={respondentHireType}
                                            onChange={(e) => setRespondentHireType(e.target.value)}
                                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        >
                                            <option value="">選択してください</option>
                                            <option value="new_grad">新卒</option>
                                            <option value="mid_career">中途</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {questions.map((question, index) => (
                        <div
                            key={question.id}
                            id={`question-${question.id}`}
                            className={`bg-white rounded-xl shadow-sm border px-6 py-6 ${errors[question.id] ? "border-red-400" : "border-slate-200"}`}
                        >
                            <p className="text-base font-medium text-slate-900 mb-4">
                                <span className="text-indigo-500 text-sm font-semibold mr-2">{index + 1}.</span>
                                {question.text}
                                <span className="text-red-500 ml-1 text-sm">*</span>
                            </p>

                            {question.type === "score" && (
                                <div className="space-y-2">
                                    {ratingOptions.map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                                                answers[question.id] === option.value
                                                    ? "border-indigo-400 bg-indigo-50"
                                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${question.id}`}
                                                value={option.value}
                                                checked={answers[question.id] === option.value}
                                                onChange={() => setAnswer(question.id, option.value)}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700">
                                                {option.value}　{option.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {question.type === "choice" && (
                                <div className="space-y-2">
                                    {(question.options ?? []).filter(Boolean).map((opt, i) => (
                                        <label
                                            key={i}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                                                answers[question.id] === opt
                                                    ? "border-indigo-400 bg-indigo-50"
                                                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name={`question-${question.id}`}
                                                value={opt}
                                                checked={answers[question.id] === opt}
                                                onChange={() => setAnswer(question.id, opt)}
                                                className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {question.type === "text" && (
                                <Textarea
                                    placeholder="回答を入力してください"
                                    className="min-h-[100px] resize-y bg-white text-base border-slate-300 focus-visible:ring-indigo-500"
                                    value={answers[question.id] ?? ""}
                                    onChange={(e) => setAnswer(question.id, e.target.value)}
                                />
                            )}

                            {errors[question.id] && (
                                <p className="text-red-500 text-xs mt-2">この設問への回答は必須です</p>
                            )}
                        </div>
                    ))}

                    {/* 送信ボタン: 固定フッター */}
                    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-10">
                        <div className="max-w-2xl mx-auto">
                            <Button
                                type="submit"
                                size="lg"
                                disabled={isSubmitting}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                            >
                                {isPreview ? "プレビュー送信をテスト" : (isSubmitting ? "送信中..." : "送信する")}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
    questions: { id: string; text: string; type: "score" | "text" }[];
    isPreview?: boolean;
    isAnonymous?: boolean;
    respondentFields?: RespondentFieldsConfig;
}) {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 属性フィールドの state
    const [respondentName, setRespondentName] = useState("");
    const [respondentAge, setRespondentAge] = useState("");
    const [respondentGender, setRespondentGender] = useState("");
    const [respondentJoinYear, setRespondentJoinYear] = useState("");
    const [respondentHireType, setRespondentHireType] = useState("");

    const formSchema = z.object({
        responses: z.record(
            z.string(),
            z.object({
                type: z.enum(["score", "text"]),
                value: z.string().min(1, { message: "回答を入力してください" })
            })
        ),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            responses: questions.reduce((acc, q) => ({ ...acc, [q.id]: { type: q.type, value: "" } }), {}),
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        // Check if all questions are answered
        const answeredCount = Object.keys(values.responses).filter(k => values.responses[k]?.value !== "").length;
        if (answeredCount !== questions.length) {
            alert("すべての設問に回答してください");
            return;
        }

        // 属性フィールドのバリデーション
        if (!isAnonymous) {
            if (respondentFields.name && !respondentName.trim()) { alert("名前を入力してください"); return; }
            if (respondentFields.age && !respondentAge) { alert("年齢を入力してください"); return; }
            if (respondentFields.gender && !respondentGender) { alert("性別を選択してください"); return; }
            if (respondentFields.join_year && !respondentJoinYear) { alert("入社年度を選択してください"); return; }
            if (respondentFields.hire_type && !respondentHireType) { alert("新卒/中途を選択してください"); return; }
        }

        if (isPreview) {
            alert("プレビューモードのため、実際のデータは送信されません。");
            return;
        }

        setIsSubmitting(true);
        try {
            const respondentData = isAnonymous ? undefined : {
                name: respondentFields.name ? respondentName.trim() : undefined,
                age: respondentFields.age ? parseInt(respondentAge, 10) : undefined,
                gender: respondentFields.gender ? respondentGender : undefined,
                join_year: respondentFields.join_year ? parseInt(respondentJoinYear, 10) : undefined,
                hire_type: respondentFields.hire_type ? respondentHireType : undefined,
            };
            const result = await submitSurveyResponse(surveyId, values.responses, respondentData);
            if (result.error) {
                alert("エラーが発生しました: " + result.error);
            } else {
                setIsSubmitted(true);
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
            <div className="min-h-screen bg-[#ede7f6] py-12 px-4 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl">
                    {/* ヘッダーバー */}
                    <div className="h-2 bg-[#673ab7] rounded-t-xl" />
                    <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-[#673ab7] rounded-full flex items-center justify-center shrink-0">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-normal text-slate-800">回答を記録しました</h2>
                        </div>
                        <p className="text-slate-600 ml-[52px]">
                            ご回答いただきありがとうございました。
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#ede7f6] py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                {/* タイトルカード */}
                <div className="mb-4 relative">
                    <div className="h-2.5 bg-[#673ab7] rounded-t-xl" />
                    <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 px-8 py-6">
                        {isPreview && (
                            <div className="mb-3">
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                                    プレビュー中
                                </Badge>
                            </div>
                        )}
                        <h1 className="text-3xl font-normal text-slate-800 mb-3">{title}</h1>
                        {(description) && (
                            <p className="text-slate-600 whitespace-pre-wrap text-sm">{description}</p>
                        )}
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* 属性フォーム（非匿名の場合のみ表示） */}
                        {!isAnonymous && (
                            <Card className="p-6 md:p-8 bg-white rounded-xl shadow-sm border-slate-200">
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
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}
                                    {respondentFields.gender && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-slate-700">性別</label>
                                            <select
                                                value={respondentGender}
                                                onChange={(e) => setRespondentGender(e.target.value)}
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="">選択してください</option>
                                                <option value="new_grad">新卒</option>
                                                <option value="mid_career">中途</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {questions.map((question, index) => (
                            <FormField
                                key={question.id}
                                control={form.control}
                                name={`responses.${question.id}`}
                                render={({ field }) => (
                                    <FormItem>
                                        <Card className="p-6 bg-white rounded-xl shadow-sm border-slate-200">
                                            <p className="text-base text-slate-800 mb-4">
                                                <span className="text-slate-400 text-sm mr-2">{index + 1}.</span>
                                                {question.text}
                                            </p>

                                            <FormControl>
                                                {question.type === "score" ? (
                                                    <RadioGroup
                                                        onValueChange={(val) => field.onChange({ type: "score", value: val })}
                                                        defaultValue={field.value?.value || ""}
                                                        value={field.value?.value || ""}
                                                        className="space-y-2"
                                                    >
                                                        {ratingOptions.map((option) => (
                                                            <div key={option.value} className="flex items-center gap-3">
                                                                <RadioGroupItem
                                                                    value={option.value}
                                                                    id={`${question.id}-${option.value}`}
                                                                    className="border-slate-400 text-[#673ab7] focus-visible:ring-[#673ab7] data-[state=checked]:bg-[#673ab7] data-[state=checked]:border-[#673ab7]"
                                                                />
                                                                <label
                                                                    htmlFor={`${question.id}-${option.value}`}
                                                                    className="text-sm text-slate-700 cursor-pointer select-none"
                                                                >
                                                                    {option.value}　{option.label}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </RadioGroup>
                                                ) : (
                                                    <Textarea
                                                        placeholder="回答を入力してください"
                                                        className="min-h-[120px] resize-y bg-white text-base border-0 border-b-2 border-slate-300 rounded-none focus-visible:ring-0 focus-visible:border-[#673ab7] shadow-none px-0"
                                                        value={field.value?.value || ""}
                                                        onChange={(e) => field.onChange({ type: "text", value: e.target.value })}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="mt-4" />
                                        </Card>
                                    </FormItem>
                                )}
                            />
                        ))}

                        <div className="flex justify-between items-center pt-2">
                            <Button
                                type="submit"
                                size="lg"
                                disabled={isSubmitting}
                                className="px-8 bg-[#673ab7] hover:bg-[#5e35b1] text-white rounded font-medium"
                            >
                                {isPreview ? "プレビュー送信をテスト" : (isSubmitting ? "送信中..." : "送信")}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}

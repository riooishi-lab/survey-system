"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { copyCompanySurvey } from "@/app/actions/company-survey";

export default function SurveyCopyButton({ surveyId }: { surveyId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleCopy() {
        setLoading(true);
        const result = await copyCompanySurvey(surveyId);
        setLoading(false);
        if (result.error) {
            alert("コピーに失敗しました: " + result.error);
        } else {
            router.push(`/company/surveys/${result.surveyId}`);
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-1 text-slate-600 border-slate-200 hover:bg-slate-50 shadow-none"
            onClick={handleCopy}
            disabled={loading}
            title="コピーして新規作成"
        >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
            コピー
        </Button>
    );
}

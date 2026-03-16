"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Check } from "lucide-react";
import { issueSurveyLink } from "@/app/actions/company-survey";

interface SurveyLinkButtonProps {
    surveyId: string;
}

export default function SurveyLinkButton({ surveyId }: SurveyLinkButtonProps) {
    const [state, setState] = useState<"idle" | "loading" | "copied" | "error">("idle");

    async function handleClick() {
        if (state === "loading") return;
        setState("loading");

        const result = await issueSurveyLink(surveyId);

        if (result.error || !result.token) {
            setState("error");
            setTimeout(() => setState("idle"), 2000);
            return;
        }

        const url = `${window.location.origin}/survey/${result.token}`;
        await navigator.clipboard.writeText(url);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-1 shadow-none min-w-[88px]"
            onClick={handleClick}
            disabled={state === "loading"}
        >
            {state === "copied" ? (
                <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">コピーしました</span>
                </>
            ) : state === "error" ? (
                <span className="text-red-600">エラー</span>
            ) : (
                <>
                    <Link2 className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-slate-600">{state === "loading" ? "発行中..." : "リンク"}</span>
                </>
            )}
        </Button>
    );
}

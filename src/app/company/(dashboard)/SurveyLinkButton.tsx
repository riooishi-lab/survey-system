"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Link2, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { issueSurveyLink } from "@/app/actions/company-survey";

interface SurveyLinkButtonProps {
    surveyId: string;
    surveyTitle: string;
}

export default function SurveyLinkButton({ surveyId, surveyTitle }: SurveyLinkButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [linkUrl, setLinkUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    async function handleClick() {
        setLoading(true);
        setError(null);
        setLinkUrl(null);
        setOpen(true);

        const result = await issueSurveyLink(surveyId);

        if (result.error) {
            setError(result.error);
        } else if (result.token) {
            const url = `${window.location.origin}/survey/${result.token}`;
            setLinkUrl(url);
        }

        setLoading(false);
    }

    async function handleCopy() {
        if (!linkUrl) return;
        await navigator.clipboard.writeText(linkUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleOpenChange(isOpen: boolean) {
        setOpen(isOpen);
        if (!isOpen) {
            setLinkUrl(null);
            setError(null);
            setCopied(false);
        }
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="gap-1 text-slate-600 shadow-none"
                onClick={handleClick}
            >
                <Link2 className="w-3.5 h-3.5" />
                リンク
            </Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>回答リンクを発行しました</DialogTitle>
                        <DialogDescription>
                            {surveyTitle} の回答リンクです。回答者に共有してください。
                        </DialogDescription>
                    </DialogHeader>

                    {loading && (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            <span className="ml-2 text-slate-500">リンクを発行中...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {linkUrl && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <span className="flex-1 text-sm text-slate-700 break-all font-mono">
                                    {linkUrl}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-slate-500" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {linkUrl && (
                            <Button
                                variant="outline"
                                className="gap-1"
                                onClick={() => window.open(linkUrl, "_blank")}
                            >
                                <ExternalLink className="w-4 h-4" />
                                リンクを開く
                            </Button>
                        )}
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => handleOpenChange(false)}
                        >
                            閉じる
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

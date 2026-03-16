"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, Loader2 } from "lucide-react";
import { deleteCompanySurvey } from "@/app/actions/company-survey";

interface SurveyDeleteButtonProps {
    surveyId: string;
    surveyTitle: string;
}

export default function SurveyDeleteButton({ surveyId, surveyTitle }: SurveyDeleteButtonProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleDelete() {
        setLoading(true);
        const result = await deleteCompanySurvey(surveyId);
        setLoading(false);

        if (!result.error) {
            setOpen(false);
            router.refresh();
        }
    }

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shadow-none"
                onClick={() => setOpen(true)}
            >
                <Trash2 className="w-3.5 h-3.5" />
                削除
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>サーベイを削除しますか？</DialogTitle>
                        <DialogDescription>
                            「{surveyTitle}」を削除します。この操作は取り消せません。回答データやリンクもすべて削除されます。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            キャンセル
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white gap-1"
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

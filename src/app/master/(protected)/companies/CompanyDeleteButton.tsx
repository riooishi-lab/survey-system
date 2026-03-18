"use client";

import { useState } from "react";
import { deleteCompany } from "@/app/actions/master";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function CompanyDeleteButton({
    companyId,
    companyName,
}: {
    companyId: string;
    companyName: string;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        const confirmed = window.confirm(
            `「${companyName}」をアーカイブしますか？\n\nアカウントは無効化され、ログインできなくなります。\nデータはサーバーに保持されます（完全削除は管理者にご連絡ください）。`
        );
        if (!confirmed) return;

        setIsLoading(true);
        const result = await deleteCompany(companyId);
        if (result.error) {
            alert(result.error);
            setIsLoading(false);
        } else {
            router.refresh();
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isLoading}
            className="text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
        >
            <Trash2 className="w-3.5 h-3.5" />
        </Button>
    );
}

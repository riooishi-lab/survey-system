"use client";

import { useState } from "react";
import { updateCompanyStatus } from "@/app/actions/master";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

export default function CompanyStatusToggle({
    companyId,
    currentStatus,
}: {
    companyId: string;
    currentStatus: string;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(currentStatus);
    const router = useRouter();
    const isActive = status === "active";

    const handleToggle = async () => {
        setIsLoading(true);
        const newStatus = isActive ? "inactive" : "active";
        const result = await updateCompanyStatus(companyId, newStatus);
        if (result.error) {
            alert(result.error);
        } else {
            setStatus(newStatus);
            router.refresh();
        }
        setIsLoading(false);
    };

    return (
        <div className="flex items-center gap-3">
            {/* 現在のステータス表示 */}
            <div className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border ${
                isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
            }`}>
                {isActive
                    ? <CheckCircle2 className="w-3.5 h-3.5" />
                    : <XCircle className="w-3.5 h-3.5" />
                }
                {isActive ? "有効" : "無効"}
            </div>

            {/* トグルボタン */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleToggle}
                disabled={isLoading}
                className={
                    isActive
                        ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                }
            >
                {isLoading ? "..." : isActive ? "無効にする" : "有効にする"}
            </Button>
        </div>
    );
}

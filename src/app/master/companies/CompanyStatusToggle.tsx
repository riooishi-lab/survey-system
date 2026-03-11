"use client";

import { useState } from "react";
import { updateCompanyStatus } from "@/app/actions/master";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function CompanyStatusToggle({
    companyId,
    currentStatus,
}: {
    companyId: string;
    currentStatus: string;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleToggle = async () => {
        setIsLoading(true);
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        const result = await updateCompanyStatus(companyId, newStatus);
        if (result.error) {
            alert(result.error);
        } else {
            router.refresh();
        }
        setIsLoading(false);
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={isLoading}
            className={
                currentStatus === "active"
                    ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            }
        >
            {isLoading ? "..." : currentStatus === "active" ? "無効化" : "有効化"}
        </Button>
    );
}

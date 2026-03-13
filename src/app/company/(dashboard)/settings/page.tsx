import { requireCompanyAuth } from "@/lib/auth";
import { getCompanyDepartmentOptions } from "@/app/actions/company-survey";
import DepartmentSettingsClient from "./DepartmentSettingsClient";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
    await requireCompanyAuth();
    const departmentOptions = await getCompanyDepartmentOptions();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">企業設定</h2>
                <p className="text-slate-500 mt-1">部署リストなどの企業固有の設定を管理します</p>
            </div>
            <DepartmentSettingsClient initialOptions={departmentOptions} />
        </div>
    );
}

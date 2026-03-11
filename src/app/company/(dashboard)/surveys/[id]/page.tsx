import { notFound } from "next/navigation";
import { requireCompanyAuth } from "@/lib/auth";
import { getCompanySurvey } from "@/app/actions/company-survey";
import SurveyEditClient from "./SurveyEditClient";

export const dynamic = "force-dynamic";

export default async function CompanySurveyPage({ params }: { params: Promise<{ id: string }> }) {
    await requireCompanyAuth();
    const { id } = await params;
    const { data, error } = await getCompanySurvey(id);

    if (error || !data) return notFound();

    return <SurveyEditClient survey={data} />;
}

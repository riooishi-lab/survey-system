import { getSupabase } from "@/lib/supabase-server";
import SurveyClientForm from "./SurveyClientForm";

export const dynamic = "force-dynamic";

export default async function SurveyPage() {
  const supabase = getSupabase();

  // Fetch the latest active survey and its questions
  const { data: survey, error: surveyError } = await supabase
    .from("surveys")
    .select(`
      *,
      questions (*)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (surveyError && surveyError.code !== "PGRST116") { // Ignore no rows found error
    console.error("Error fetching active survey:", surveyError);
  }

  if (!survey || !survey.questions || survey.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">従業員サーベイ</h1>
          <p className="text-slate-600">現在回答可能なアンケートはありません。</p>
        </div>
      </div>
    );
  }

  // Sort questions by their defined order
  const questions = survey.questions.sort((a: any, b: any) => a.order_index - b.order_index);

  return <SurveyClientForm surveyId={survey.id} title={survey.title} description={survey.description} questions={questions} />;
}

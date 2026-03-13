"use server";

import { getSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function getSurvey(id: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
        .from("surveys")
        .select("*, questions(*)")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Fetch survey error:", error);
        return { error: "Failed to fetch survey" };
    }

    if (data && data.questions) {
        data.questions.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return { data };
}

export async function createSurvey(data: {
    title: string;
    description: string;
    deadline: string;
    status: "draft" | "active" | "closed";
    questions: { text: string; type: "score" | "text"; order_index: number }[];
}) {
    const supabase = getSupabase();

    const { data: survey, error: surveyError } = await supabase
        .from("surveys")
        .insert({
            title: data.title,
            description: data.description || null,
            deadline: data.deadline || null,
            status: data.status,
        })
        .select()
        .single();

    if (surveyError || !survey) {
        console.error("Survey creation error:", surveyError);
        return { error: "Failed to create survey" };
    }

    if (data.questions && data.questions.length > 0) {
        const questionsToInsert = data.questions.map((q) => ({
            survey_id: survey.id,
            text: q.text,
            type: q.type,
            order_index: q.order_index,
        }));

        const { error: questionsError } = await supabase
            .from("questions")
            .insert(questionsToInsert);

        if (questionsError) {
            console.error("Questions creation error:", questionsError);
            return { error: "Failed to create questions" };
        }
    }

    revalidatePath("/admin");
    return { success: true, surveyId: survey.id };
}

export async function updateSurvey(id: string, data: {
    title: string;
    description: string;
    deadline: string;
    status: "draft" | "active" | "closed";
    questions: { id?: string; text: string; type: "score" | "text"; order_index: number }[];
}) {
    const supabase = getSupabase();

    const { error: surveyError } = await supabase
        .from("surveys")
        .update({
            title: data.title,
            description: data.description || null,
            deadline: data.deadline || null,
            status: data.status,
        })
        .eq("id", id);

    if (surveyError) {
        console.error("Survey update error:", surveyError);
        return { error: "Failed to update survey" };
    }

    // Upsert questions: update existing, insert new, delete removed
    const existingQuestionIds = data.questions
        .filter((q) => q.id)
        .map((q) => q.id!);

    // Delete only questions that were removed by the user
    if (existingQuestionIds.length > 0) {
        const { error: deleteError } = await supabase
            .from("questions")
            .delete()
            .eq("survey_id", id)
            .not("id", "in", `(${existingQuestionIds.join(",")})`);

        if (deleteError) {
            console.error("Questions delete error:", deleteError);
            return { error: "Failed to delete removed questions" };
        }
    } else {
        // All questions are new, delete all existing ones
        await supabase.from("questions").delete().eq("survey_id", id);
    }

    if (data.questions && data.questions.length > 0) {
        const questionsToUpdate = data.questions.filter((q) => q.id);
        const questionsToInsert = data.questions.filter((q) => !q.id);

        // Update existing questions
        for (const q of questionsToUpdate) {
            const { error: updateError } = await supabase
                .from("questions")
                .update({
                    text: q.text,
                    type: q.type,
                    order_index: q.order_index,
                })
                .eq("id", q.id!);

            if (updateError) {
                console.error("Question update error:", updateError);
                return { error: "Failed to update question" };
            }
        }

        // Insert new questions
        if (questionsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from("questions")
                .insert(
                    questionsToInsert.map((q) => ({
                        survey_id: id,
                        text: q.text,
                        type: q.type,
                        order_index: q.order_index,
                    }))
                );

            if (insertError) {
                console.error("Questions insert error:", insertError);
                return { error: "Failed to add new questions" };
            }
        }
    }

    revalidatePath("/admin");
    return { success: true, surveyId: id };
}

export async function submitSurveyResponse(
    surveyId: string,
    responses: Record<string, { type: "score" | "text" | "choice"; value: string }>,
    respondentData?: {
        name?: string;
        age?: number;
        gender?: string;
        join_year?: number;
        hire_type?: string;
        department?: string;
    }
) {
    const supabase = getSupabase();

    const { data: response, error: responseError } = await supabase
        .from("responses")
        .insert({
            survey_id: surveyId,
            respondent_name: respondentData?.name ?? null,
            respondent_age: respondentData?.age ?? null,
            respondent_gender: respondentData?.gender ?? null,
            respondent_join_year: respondentData?.join_year ?? null,
            respondent_hire_type: respondentData?.hire_type ?? null,
            respondent_department: respondentData?.department ?? null,
        })
        .select()
        .single();

    if (responseError || !response) {
        console.error("Response creation error:", responseError);
        return { error: "Failed to record response" };
    }

    const answersToInsert = Object.entries(responses).map(([questionId, answer]) => ({
        response_id: response.id,
        question_id: questionId,
        score: answer.type === "score" ? parseInt(answer.value, 10) : null,
        text_value: answer.type === "text" || answer.type === "choice" ? answer.value : null,
    }));

    const { error: answersError } = await supabase
        .from("answers")
        .insert(answersToInsert);

    if (answersError) {
        console.error("Answers creation error:", answersError);
        return { error: "Failed to record answers" };
    }

    return { success: true };
}

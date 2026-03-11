-- 従業員サーベイシステム データベーススキーマ

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Surveys Table (アンケートの基本情報)
CREATE TABLE public.surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    deadline DATE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Questions Table (アンケート内の各設問)
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'score' CHECK (type IN ('score', 'text')),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Responses Table (誰がいつ回答したか、今回は匿名を想定)
CREATE TABLE public.responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Answers Table (各質問に対する評価スコアまたはテキスト)
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 1 AND score <= 5 OR score IS NULL),
    text_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Settings
-- 今回はテスト用のため、一旦全アクセスを許可するポリシーを設定します。
-- ※本番運用時は適切な認証(Auth)とポリシー設定を行ってください。

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on surveys" ON public.surveys FOR SELECT USING (true);
CREATE POLICY "Allow public insert on surveys" ON public.surveys FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on surveys" ON public.surveys FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on questions" ON public.questions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on questions" ON public.questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on questions" ON public.questions FOR DELETE USING (true);

CREATE POLICY "Allow public insert access on responses" ON public.responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access on responses" ON public.responses FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on answers" ON public.answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read access on answers" ON public.answers FOR SELECT USING (true);

-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_questions_survey_id ON public.questions(survey_id);
CREATE INDEX idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX idx_answers_response_id ON public.answers(response_id);
CREATE INDEX idx_answers_question_id ON public.answers(question_id);

-- =====================================================
-- サーベイシステム v2 スキーマ追加分
-- 既存スキーマ(database_schema.sql)に追加で実行してください
-- =====================================================

-- Enable pgcrypto for random token generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Companies Table (企業アカウント)
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    contact_name TEXT,
    access_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. surveys テーブルに company_id を追加
ALTER TABLE public.surveys
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. Survey Links Table (社員向け回答リンク)
CREATE TABLE public.survey_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS設定
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on survey_links" ON public.survey_links FOR ALL USING (true) WITH CHECK (true);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_surveys_company_id ON public.surveys(company_id);
CREATE INDEX IF NOT EXISTS idx_survey_links_token ON public.survey_links(token);
CREATE INDEX IF NOT EXISTS idx_survey_links_survey_id ON public.survey_links(survey_id);
CREATE INDEX IF NOT EXISTS idx_companies_access_token ON public.companies(access_token);
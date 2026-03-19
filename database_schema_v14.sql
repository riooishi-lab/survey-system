-- =====================================================
-- サーベイシステム v14 スキーマ
-- 重複回答防止 + 同意記録テーブル + 閲覧権限テーブル
-- Supabase の SQL Editor で実行してください
-- =====================================================

-- 1. 重複回答防止: 回答トークンテーブル
-- リンクごとにワンタイムトークンを発行し、1トークン1回答を強制
CREATE TABLE IF NOT EXISTS public.response_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_link_id UUID NOT NULL REFERENCES public.survey_links(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_response_tokens_token ON public.response_tokens(token);
CREATE INDEX IF NOT EXISTS idx_response_tokens_survey_link_id ON public.response_tokens(survey_link_id);

ALTER TABLE public.response_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access on response_tokens" ON public.response_tokens FOR ALL TO anon USING (false);
CREATE POLICY "Deny auth access on response_tokens" ON public.response_tokens FOR ALL TO authenticated USING (false);

-- 2. 同意記録テーブル
CREATE TABLE IF NOT EXISTS public.survey_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    response_id UUID REFERENCES public.responses(id) ON DELETE SET NULL,
    consented_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_survey_consents_survey_id ON public.survey_consents(survey_id);

ALTER TABLE public.survey_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access on survey_consents" ON public.survey_consents FOR ALL TO anon USING (false);
CREATE POLICY "Deny auth access on survey_consents" ON public.survey_consents FOR ALL TO authenticated USING (false);

-- 3. 閲覧権限 (ユーザーロール) テーブル
CREATE TABLE IF NOT EXISTS public.company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON public.company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_email ON public.company_users(email);

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access on company_users" ON public.company_users FOR ALL TO anon USING (false);
CREATE POLICY "Deny auth access on company_users" ON public.company_users FOR ALL TO authenticated USING (false);

-- 4. サーベイ閲覧権限テーブル（どのユーザーがどのサーベイ結果を閲覧できるか）
CREATE TABLE IF NOT EXISTS public.survey_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    company_user_id UUID NOT NULL REFERENCES public.company_users(id) ON DELETE CASCADE,
    can_view_results BOOLEAN DEFAULT true,
    can_view_individual BOOLEAN DEFAULT false,
    department_filter TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (survey_id, company_user_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_permissions_survey_id ON public.survey_permissions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_permissions_user_id ON public.survey_permissions(company_user_id);

ALTER TABLE public.survey_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access on survey_permissions" ON public.survey_permissions FOR ALL TO anon USING (false);
CREATE POLICY "Deny auth access on survey_permissions" ON public.survey_permissions FOR ALL TO authenticated USING (false);

-- 5. リマインドメール送信記録
CREATE TABLE IF NOT EXISTS public.survey_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    sent_by UUID REFERENCES public.companies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_survey_reminders_survey_id ON public.survey_reminders(survey_id);

ALTER TABLE public.survey_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny anon access on survey_reminders" ON public.survey_reminders FOR ALL TO anon USING (false);
CREATE POLICY "Deny auth access on survey_reminders" ON public.survey_reminders FOR ALL TO authenticated USING (false);

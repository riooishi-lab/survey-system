-- =====================================================
-- セキュリティ修正マイグレーション
-- Supabase の SQL Editor で実行してください
-- =====================================================

-- =====================================================
-- 1. セッション管理テーブルの作成
-- =====================================================

CREATE TABLE IF NOT EXISTS public.master_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.company_setup_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_master_sessions_token ON public.master_sessions(token);
CREATE INDEX IF NOT EXISTS idx_master_sessions_expires_at ON public.master_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_company_sessions_token ON public.company_sessions(token);
CREATE INDEX IF NOT EXISTS idx_company_sessions_expires_at ON public.company_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_company_setup_sessions_token ON public.company_setup_sessions(token);

-- =====================================================
-- 2. 既存の全許可 RLS ポリシーを削除
-- =====================================================

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow public read access on surveys" ON public.surveys;
    DROP POLICY IF EXISTS "Allow public insert on surveys" ON public.surveys;
    DROP POLICY IF EXISTS "Allow public update on surveys" ON public.surveys;
    DROP POLICY IF EXISTS "Allow public read access on questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow public insert on questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow public update on questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow public delete on questions" ON public.questions;
    DROP POLICY IF EXISTS "Allow public insert access on responses" ON public.responses;
    DROP POLICY IF EXISTS "Allow public read access on responses" ON public.responses;
    DROP POLICY IF EXISTS "Allow public insert access on answers" ON public.answers;
    DROP POLICY IF EXISTS "Allow public read access on answers" ON public.answers;
    DROP POLICY IF EXISTS "Allow all on companies" ON public.companies;
    DROP POLICY IF EXISTS "Allow all on survey_links" ON public.survey_links;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on password_reset_tokens" ON public.password_reset_tokens;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- =====================================================
-- 3. RLS を有効化
-- =====================================================

ALTER TABLE public.master_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_setup_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- =====================================================
-- 4. anon / authenticated ロールの権限を剥奪
-- =====================================================

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'surveys', 'questions', 'responses', 'answers',
        'companies', 'survey_links',
        'password_reset_tokens',
        'master_sessions', 'company_sessions', 'company_setup_sessions'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
            EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', tbl);
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- 備考
-- =====================================================
-- このシステムはすべての DB 操作をサーバーサイド（service_role キー）経由で行います。
-- service_role キーは RLS を完全にバイパスするため、ポリシーの有無に関わらず動作します。
-- anon / authenticated ロールからのアクセスを完全に遮断することで、
-- Supabase の REST API や JS クライアントからの直接アクセスを防ぎます。

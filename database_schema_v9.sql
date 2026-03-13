-- =====================================================
-- サーベイシステム v9 スキーマ修正
-- Supabase の SQL Editor で実行してください
-- =====================================================

-- 1. responses テーブルに respondent カラムを追加（未適用の場合）
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS respondent_name TEXT;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS respondent_age INTEGER;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS respondent_gender TEXT;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS respondent_join_year INTEGER;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS respondent_hire_type TEXT;
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS respondent_department TEXT;

-- 2. questions テーブルに options カラムを追加（未適用の場合）
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

-- 3. questions テーブルの type CHECK 制約を 'choice' を含む形に更新
DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    SELECT conname INTO v_constraint
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'questions'
      AND t.relnamespace = 'public'::regnamespace
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%type%score%text%';

    IF v_constraint IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.questions DROP CONSTRAINT ' || quote_ident(v_constraint);
    END IF;

    -- 'choice' を許可する制約を追加（既存でない場合）
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'questions'
          AND t.relnamespace = 'public'::regnamespace
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%choice%'
    ) THEN
        ALTER TABLE public.questions
            ADD CONSTRAINT questions_type_check
            CHECK (type IN ('score', 'text', 'choice'));
    END IF;
END $$;

-- 4. surveys テーブルに is_anonymous / respondent_fields / company_id を追加（未適用の場合）
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS respondent_fields JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS company_id UUID;

-- 5. インデックス
CREATE INDEX IF NOT EXISTS idx_responses_survey_id ON public.responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_respondent_department ON public.responses(respondent_department);

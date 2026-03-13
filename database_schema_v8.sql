-- =====================================================
-- サーベイシステム v8 スキーマ修正
-- Supabase の SQL Editor で実行してください
-- =====================================================

-- 1. companies テーブルに department_options カラムを追加（未適用の場合）
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS department_options JSONB DEFAULT '[]'::jsonb;

-- 2. responses テーブルに respondent_department カラムを追加（未適用の場合）
ALTER TABLE public.responses
    ADD COLUMN IF NOT EXISTS respondent_department TEXT;

-- 3. questions テーブルに options カラムを追加（未適用の場合）
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

-- 4. companies テーブルの UPDATE ポリシーが存在しない場合に追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'companies' AND policyname = 'Allow update on companies'
    ) THEN
        CREATE POLICY "Allow update on companies" ON public.companies
            FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END $$;

-- インデックス（既存なら無視）
CREATE INDEX IF NOT EXISTS idx_responses_respondent_department ON public.responses(respondent_department);

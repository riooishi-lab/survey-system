-- =====================================================
-- サーベイシステム v7 スキーマ追加分
-- 既存スキーマ(database_schema_v6.sql)に追加で実行してください
-- =====================================================

-- 1. companies テーブルに部署選択肢リストを追加
--    department_options: 企業管理者が設定する部署名のリスト (JSONB配列)
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS department_options JSONB DEFAULT '[]'::jsonb;

-- 2. responses テーブルに部署カラムを追加
ALTER TABLE public.responses
    ADD COLUMN IF NOT EXISTS respondent_department TEXT;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_responses_respondent_department ON public.responses(respondent_department);

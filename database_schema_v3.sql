-- =====================================================
-- サーベイシステム v3 スキーマ追加分
-- 既存スキーマ(database_schema_v2.sql)に追加で実行してください
-- =====================================================

-- 1. surveys テーブルに回答者属性設定を追加
--    is_anonymous: true = 匿名, false = 属性情報を収集する
--    respondent_fields: 収集する属性フィールドの設定 (JSONB)
ALTER TABLE public.surveys
    ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS respondent_fields JSONB DEFAULT '{"name":false,"age":false,"gender":false,"join_year":false,"hire_type":false}'::jsonb;

-- 2. responses テーブルに回答者属性カラムを追加
--    is_anonymous = false の場合のみ値が入る
ALTER TABLE public.responses
    ADD COLUMN IF NOT EXISTS respondent_name TEXT,
    ADD COLUMN IF NOT EXISTS respondent_age INTEGER,
    ADD COLUMN IF NOT EXISTS respondent_gender TEXT CHECK (respondent_gender IN ('male', 'female', 'other', 'prefer_not_to_say') OR respondent_gender IS NULL),
    ADD COLUMN IF NOT EXISTS respondent_join_year INTEGER,
    ADD COLUMN IF NOT EXISTS respondent_hire_type TEXT CHECK (respondent_hire_type IN ('new_grad', 'mid_career') OR respondent_hire_type IS NULL);

-- インデックス (属性検索・集計に利用)
CREATE INDEX IF NOT EXISTS idx_responses_respondent_gender ON public.responses(respondent_gender);
CREATE INDEX IF NOT EXISTS idx_responses_respondent_join_year ON public.responses(respondent_join_year);
CREATE INDEX IF NOT EXISTS idx_responses_respondent_hire_type ON public.responses(respondent_hire_type);

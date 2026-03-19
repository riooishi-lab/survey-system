-- =====================================================
-- サーベイシステム v13 スキーマ
-- 想定回答者数カラム追加
-- Supabase の SQL Editor で実行してください
-- =====================================================

ALTER TABLE public.surveys
    ADD COLUMN IF NOT EXISTS target_respondents INTEGER DEFAULT NULL;

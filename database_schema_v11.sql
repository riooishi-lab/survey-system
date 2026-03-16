-- =====================================================
-- サーベイシステム v11 スキーマ修正
-- ジャンル (genre) カラムを questions テーブルに追加
-- Supabase の SQL Editor で実行してください
-- =====================================================

-- questions テーブルに genre カラムを追加
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS genre TEXT DEFAULT NULL;

-- genre カラムへの権限付与（念のため）
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;

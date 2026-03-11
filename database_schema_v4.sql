-- =====================================================
-- サーベイシステム v4 スキーマ追加分
-- 初回セットアップ機能: ログインID・パスワード認証
-- 既存スキーマに追加で実行してください
-- =====================================================

-- companies テーブルに認証情報カラムを追加
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS is_initialized BOOLEAN DEFAULT false NOT NULL;

-- インデックス (ログインID検索高速化)
CREATE INDEX IF NOT EXISTS idx_companies_login_id ON public.companies(login_id);

-- =====================================================
-- サーベイシステム v12 スキーマ
-- ソフトデリート・監査ログ・DBレート制限
-- Supabase の SQL Editor で実行してください
-- =====================================================

-- =====================================================
-- 1. companies にソフトデリートカラムを追加
-- =====================================================

ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON public.companies(deleted_at);

-- =====================================================
-- 2. 監査ログテーブル
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    ip_address TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. DBレート制限テーブル（複数インスタンス対応）
-- =====================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_key_created ON public.rate_limit_attempts(key, created_at);

ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. 新テーブルの anon/authenticated 権限剥奪
-- =====================================================

REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM authenticated;
REVOKE ALL ON public.rate_limit_attempts FROM anon;
REVOKE ALL ON public.rate_limit_attempts FROM authenticated;

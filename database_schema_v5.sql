-- パスワードリセットトークンテーブル
-- パスワードを忘れた企業ユーザー向けのリセット用トークン管理

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (timezone('utc', now()) + INTERVAL '1 hour'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_company_id ON public.password_reset_tokens(company_id);

-- RLS（Row Level Security）は管理者側のサービスロールで操作するため無効
ALTER TABLE public.password_reset_tokens DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- サーベイシステム v10 スキーマ修正
-- Supabase の SQL Editor で実行してください
-- =====================================================

-- 1. companies テーブルの anon / authenticated ロールへの権限付与
--    (RLS ポリシーがあっても GRANT がないと UPDATE が失敗するため)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;

-- 2. department_options カラムが未追加の場合に追加
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS department_options JSONB DEFAULT '[]'::jsonb;

-- 3. companies テーブルの UPDATE ポリシーが存在しない場合に追加
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

-- 4. 既存の制限的な UPDATE ポリシーを許容ポリシーに置き換える（念のため）
DO $$
DECLARE
    v_policyname TEXT;
BEGIN
    FOR v_policyname IN
        SELECT policyname FROM pg_policies
        WHERE tablename = 'companies' AND cmd = 'UPDATE' AND policyname != 'Allow update on companies'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(v_policyname) || ' ON public.companies';
    END LOOP;
END $$;

-- 5. surveys / questions / responses / answers テーブルへの権限も念のため付与
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.answers TO authenticated;

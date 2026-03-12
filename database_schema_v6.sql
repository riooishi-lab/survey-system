-- v6: 選択式質問タイプのための options カラムを questions テーブルに追加
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

-- type カラムの CHECK 制約に 'choice' を追加
-- （元のスキーマは ENUM ではなく TEXT + CHECK 制約を使用しているため）
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_type_check CHECK (type IN ('score', 'text', 'choice'));

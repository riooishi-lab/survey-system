-- v6: 選択式質問タイプのための options カラムを questions テーブルに追加
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

-- type の ENUM に 'choice' を追加
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'choice';

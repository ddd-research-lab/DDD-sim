-- 既存の archives テーブルに compressed_history カラムを追加するマイグレーション
-- Supabase の SQL Editor で実行してください

ALTER TABLE archives
ADD COLUMN IF NOT EXISTS compressed_history JSONB;

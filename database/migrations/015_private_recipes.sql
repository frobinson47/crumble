-- 015_private_recipes.sql
ALTER TABLE recipes ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
